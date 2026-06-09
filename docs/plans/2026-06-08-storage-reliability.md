# Storage Reliability Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before implementation and superpowers:verification-before-completion before completion.

**Goal:** 사용자가 한 화면에서 로컬 자동저장, JSON 이동본 최신성, 브라우저 저장 보호 상태를 이해하고 바로 백업 또는 보호 강화를 실행할 수 있게 한다.

**Architecture:** V1.1의 첫 저장 신뢰성 증분은 서버 없이 프론트 단독으로 처리한다. `src/lib/persistence/storage-health.ts`가 Storage API 상태 계산과 안전한 feature detection을 담당하고, React 화면은 상단 저장 상태 버튼, 저장 보호 패널, 실행 전 검토 카드 리마인더만 담당한다.

**Tech Stack:** Next.js App Router static export, React client component, TypeScript, IndexedDB, Web Storage API, Node test runner.

---

## Product Manager Decision

검토한 3가지 방법:

1. PWA 설치/오프라인 먼저
   - 설치형 UX를 빠르게 보여줄 수 있지만 서비스워커, 캐시 전략, 브라우저별 설치 안내가 함께 필요해 범위가 커진다.
2. 저장 보호 UX 먼저
   - 현재 `lastExportedAt`, IndexedDB 자동저장, JSON export 흐름을 활용할 수 있고 데이터 손실 리스크를 가장 직접적으로 낮춘다.
3. 저장 보호, PWA 설치, 오프라인 캐시 동시 처리
   - V1.1 전체 방향과 맞지만 검증 범위가 커져 static export와 브라우저 편차 리스크가 커진다.

채택: 2번. 이번 증분은 `navigator.storage.persist()` 요청, 저장 용량 안내, 마지막 내보내기 리마인더만 포함한다. PWA manifest는 설치 준비 메타데이터 수준에서만 추가하고, 서비스워커 기반 오프라인 재진입과 설치 프롬프트는 다음 증분으로 분리한다.

공식 근거:

- Next.js App Router는 `app/manifest.ts`로 web app manifest를 생성할 수 있다: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- Next.js static export는 서버 기능 없는 정적 산출물에 적합하다: https://nextjs.org/docs/app/guides/static-exports
- MDN StorageManager는 `estimate()`, `persist()`, `persisted()`를 제공한다: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager
- MDN storage quotas 문서는 브라우저 저장소가 best-effort가 기본이며 persistent storage도 사용자/브라우저 정책 영향을 받는다고 설명한다: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

## Business Analyst Acceptance Criteria

- 새 작업은 의미 있는 사용자 데이터가 생기기 전까지 백업 리마인더를 띄우지 않는다.
- 커스텀 공간, 블록 템플릿, 현재 작업 블록, 결과, 체이닝 이력 중 하나라도 생기고 export가 최신이 아니면 `내보내기 필요`를 표시한다.
- JSON export 성공 직후 마지막 백업 시각과 최신성 상태가 즉시 갱신된다.
- `navigator.storage.persist()` 지원 환경에서는 요청 결과를 `보호됨` 또는 `보호되지 않음`으로 표시한다.
- Storage API 미지원 또는 비보안 컨텍스트에서는 오류가 아니라 안내 상태로 처리한다.
- `navigator.storage.estimate()` 지원 시 사용량과 quota를 읽기 쉬운 단위로 표시한다.
- 저장 보호 기능은 JSON 백업을 대체한다고 표현하지 않는다.

## UI Designer Direction

채택 화면 구성은 `상단 저장 상태 버튼 + 저장 보호 패널 + 실행 전 검토 카드 리마인더`다.

- 상단 pill은 버튼이 되고 `aria-expanded`, `aria-controls`를 제공한다.
- 데스크톱/태블릿에서는 pill 아래 popover를 열고, 모바일에서는 같은 내용을 하단 sheet처럼 보여준다.
- 패널은 3개 행만 둔다.
  - 이 기기 저장: 자동저장 상태와 실패 안내.
  - 이동본(JSON): 마지막 백업 시각과 최신성.
  - 브라우저 보호: persistent storage 요청 상태와 용량 안내.
- CTA 우선순위는 `JSON 내보내기`, `이 브라우저에서 작업 보호 강화`, 닫기 순서다.
- 실행 전 검토 카드에는 백업 필요 상태에서 비차단형 문구와 `지금 내보내기` CTA를 붙인다.
- 가져오기 충돌 패널에는 현재 작업 먼저 내보내기 CTA를 추가한다.

## Task 1: Storage Health Utility

**Files:**

- Create: `src/lib/persistence/storage-health.ts`
- Create: `src/lib/persistence/storage-health.test.ts`

**Step 1: Write failing tests**

- 의미 있는 작업 데이터가 없으면 export stale이어도 리마인더를 표시하지 않는다.
- 의미 있는 데이터가 있고 `lastExportedAt`이 없거나 `updatedAt`보다 오래됐으면 리마인더를 표시한다.
- `estimate()` 결과를 `KB/MB/GB`와 percentage로 정리한다.
- Storage API 미지원/비보안 컨텍스트를 graceful 상태로 반환한다.
- `persist()` 성공/거절/미지원 결과를 구분한다.

**Step 2: Implement utility**

- `hasMeaningfulWorkspaceData(workspace)`
- `shouldRemindExport(workspace)`
- `formatStorageBytes(bytes)`
- `createStorageHealthSnapshot(context)`
- `readStorageHealth(storage, isSecureContext)`
- `requestStoragePersistence(storage, isSecureContext)`

## Task 2: UI Wiring

**Files:**

- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Step 1: State and actions**

- `storageHealth`, `lastLocalSavedAt`, `storagePanelOpen`, `persistenceRequesting` state를 추가한다.
- workspace load/save/export 후 Storage API 상태를 refresh한다.
- 저장 실패 시 storage panel을 자동으로 열어 backup CTA를 노출한다.

**Step 2: Components**

- `SaveStatusPill`을 버튼형 트리거로 변경한다.
- `StorageReliabilityPanel`을 추가한다.
- `ReviewCompactCard`에 export reminder CTA를 추가한다.
- `ImportConflictPanel`에 `현재 작업 먼저 내보내기` CTA를 추가한다.

## Task 3: PWA Manifest Preparation

**Files:**

- Create: `src/app/manifest.ts`
- Create: `public/icon.svg`
- Modify: `src/app/layout.tsx`

**Scope:**

- static export 호환 고정 manifest만 추가한다.
- 서비스워커, push, install prompt는 제외한다.
- icon asset은 루트 경로에서 200 응답이 가능해야 한다.

## Task 4: Planning Document Alignment

**Files:**

- Modify: `docs/tetris-ui-planning-draft.md`

**Step 1: Update V1.1 current increment**

- `로컬 작업본 보호 UX 1차`를 명시한다.
- PWA 설치/서비스워커는 후속 증분으로 분리한다고 명시한다.

## Task 5: Verification

Run:

```bash
npm test
npx tsc --noEmit
npm run build
npm audit --audit-level=moderate
```

Browser checks:

- 상단 저장 pill 클릭 시 저장 보호 패널이 열린다.
- 새 빈 작업에서는 백업 리마인더가 과하게 표시되지 않는다.
- 블록 또는 공간 추가 후 내보내기 리마인더와 CTA가 표시된다.
- JSON export 후 리마인더가 사라진다.
- 저장 보호 강화 CTA가 지원/미지원 환경 모두에서 크래시 없이 동작한다.
- `/manifest.webmanifest` 또는 manifest 산출물이 build 후 생성되고 icon 요청이 깨지지 않는다.
- 360, 390, 768, 1280, 1440px에서 horizontal overflow가 없다.
- console error/warn이 없다.
