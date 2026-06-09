# Multi-Tab Conflict Prevention Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before implementation and superpowers:verification-before-completion before completion.

**Goal:** 동일 기기에서 같은 작업본을 여러 탭으로 열었을 때 stale 탭이 최신 IndexedDB 작업본을 조용히 덮어쓰지 못하게 한다.

**Architecture:** 저장소 레벨은 optimistic revision guard로 stale save를 차단한다. 화면 레벨은 BroadcastChannel로 같은 origin의 다른 탭 존재와 원격 저장 이벤트를 감지하고, `storage` event fallback은 BroadcastChannel 미지원 환경의 보조 신호로만 사용한다. 사용자는 `최신 작업본 불러오기` 또는 `현재 작업 JSON 백업`을 선택하게 한다.

**Tech Stack:** Next.js App Router static export, React client component, TypeScript, IndexedDB, BroadcastChannel, localStorage fallback signal, Node test runner.

---

## Product Manager Decision

검토한 3가지 방법:

1. BroadcastChannel 안내만 제공
   - 장점: 실시간으로 다른 탭 존재를 알려줄 수 있고 구현 범위가 작다.
   - 단점: 실제 IndexedDB 저장을 막지 못한다. BroadcastChannel 미지원 환경이나 늦은 저장에서는 충돌 방지가 약하다.
2. IndexedDB revision guard만 제공
   - 장점: stale 저장을 데이터 레벨에서 차단한다.
   - 단점: 사용자는 왜 저장 실패가 났는지 뒤늦게 알게 되고, 여러 탭이 열린 사실을 사전에 인지하기 어렵다.
3. BroadcastChannel + storage event fallback + IndexedDB revision guard
   - 장점: 사용자는 다른 탭 존재를 미리 알고, 저장소는 stale save를 실제로 차단한다. BroadcastChannel 미지원 환경도 fallback 신호를 받을 수 있다.
   - 단점: helper와 UI 상태가 추가된다.

채택: 3번. Web Locks API는 save serialization에는 유효하지만 stale 탭이 나중에 더 오래된 상태를 쓰는 문제를 단독으로 해결하지 못하고 UX 비용도 크므로 이번 증분에서는 correctness 기반에서 제외한다. 후속 “단일 편집권 강제” enhancement로 남긴다.

공식 근거:

- BroadcastChannel은 같은 origin의 탭, 창, iframe, worker 간 기본 통신을 제공한다: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- Web Locks API는 같은 origin의 탭/worker가 공유 리소스 작업을 조율하게 하지만, 보안 컨텍스트 제약과 stale state 해결 한계가 있다: https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
- IndexedDB는 다중 탭 schema upgrade에서 `onblocked`가 발생할 수 있고, 열린 탭 간 DB 상태를 고려해야 한다: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

## Business Analyst Acceptance Criteria

- 같은 fileId의 저장소 최신 revision이 현재 탭의 마지막 저장 기준 revision보다 크면 자동저장을 차단한다.
- 저장 충돌은 일반 저장 실패와 구분해 `다른 탭에서 최신 작업본이 저장됨`으로 안내한다.
- 저장 충돌 발생 시 현재 탭의 작업은 화면에 남아 있어야 한다.
- 사용자는 `최신 작업본 불러오기`로 IndexedDB 최신본을 다시 로드할 수 있다.
- 사용자는 `현재 작업 JSON 백업`으로 stale 탭의 현재 상태를 파일로 남길 수 있다.
- 다른 탭이 열려 있으면 저장 보호 패널 또는 상단 상태 영역에서 비차단형 안내를 볼 수 있다.
- BroadcastChannel 미지원 환경에서도 revision guard는 동작해야 한다.

## UI Designer Direction

- 상단 저장 pill은 저장 충돌 시 red tone으로 `다른 탭 저장 감지`를 표시한다.
- 저장 보호 패널은 기존 3개 행을 유지하고 `이 기기 저장` 행 안에 탭 상태를 흡수한다.
  - 단일 탭: `이 탭이 편집 중`
  - 다른 탭 감지: `이 탭이 편집 중 · 다른 탭 열림`
  - 저장 충돌: `다른 탭 최신본 감지`
- 저장 충돌 패널은 작업을 막는 full-screen modal이 아니라, 현재 화면 상단 저장 패널과 실행 전 검토 카드의 warning으로 노출한다.
- CTA 우선순위는 `최신 작업본 불러오기`, `현재 작업 JSON 백업`, `계속 보기`다.
- 모바일에서는 하단 sticky 저장 pill을 누르면 같은 저장 보호 패널에서 충돌 상태와 CTA를 보여준다.

## Task 1: IndexedDB Revision Guard

**Files:**

- Modify: `src/lib/persistence/indexed-db.ts`
- Modify: `src/lib/persistence/indexed-db.test.ts`

**Step 1: Write failing tests**

- `saveWorkspace(workspace, { expectedRevision })`가 저장소 record의 revision이 expectedRevision보다 크면 충돌 에러를 던진다.
- 같은 fileId에서 expectedRevision과 저장소 revision이 같으면 저장한다.
- 다른 fileId의 import/open-copy는 expectedRevision과 무관하게 저장할 수 있다.

**Step 2: Implement utility**

- `WorkspaceSaveConflictError` 클래스를 추가한다.
- `saveWorkspace`는 기존 API 호환을 유지하고, 옵션이 있는 경우에만 revision guard를 적용한다.
- 충돌 에러에는 `storedRevision`, `incomingRevision`, `expectedRevision`, `storedUpdatedAt`을 포함한다.

## Task 2: Cross-Tab Channel Helper

**Files:**

- Create: `src/lib/persistence/workspace-sync-channel.ts`
- Create: `src/lib/persistence/workspace-sync-channel.test.ts`

**Step 1: Write failing tests**

- 다른 tabId의 `tab-opened` 메시지를 받으면 active peer를 기록한다.
- `workspace-saved` 메시지를 받으면 remote revision과 savedAt을 기록한다.
- TTL이 지난 peer는 active peer에서 제외한다.
- BroadcastChannel 미지원 팩토리는 graceful fallback을 제공한다.

**Step 2: Implement utility**

- 메시지 타입: `tab-opened`, `tab-closed`, `workspace-saved`.
- helper는 순수 reducer와 runtime adapter를 분리한다.
- React에서는 runtime adapter만 사용한다.
- BroadcastChannel 미지원 환경에서는 localStorage에 같은 메시지 payload를 짧게 기록해 `storage` event fallback 신호로 사용한다.

## Task 3: UI Wiring

**Files:**

- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Step 1: State and save flow**

- `lastPersistedRevision` state/ref를 추가한다.
- load 성공 시 revision을 저장 기준으로 둔다.
- save 성공 시 저장 기준 revision을 workspace.revision으로 갱신한다.
- save 충돌 시 `saveStatus = "conflict"`로 두고 자동저장을 멈춘다.
- `최신 작업본 불러오기`는 IndexedDB에서 최신 workspace를 load한다.
- `현재 작업 JSON 백업`은 기존 export flow를 재사용한다.

**Step 2: Channel flow**

- mount 시 tabId를 만들고 channel을 연다.
- 다른 탭 감지 시 `otherTabCount`를 갱신한다.
- 저장 성공 시 `workspace-saved`를 broadcast한다.
- 다른 탭의 더 높은 revision 저장 이벤트가 오면 비차단 warning을 표시한다.

## Task 4: Planning Document Alignment

**Files:**

- Modify: `docs/tetris-ui-planning-draft.md`

**Step 1: Update V1.1 current increment**

- 동일 기기 다중 탭 충돌 방지의 데이터 가드와 UX 상태를 명시한다.

## Task 5: Verification

Run:

```bash
npm test
npx tsc --noEmit
npm run build
npm audit --audit-level=moderate
```

Browser checks:

- 두 탭을 열면 저장 보호 패널에 다른 탭 열림이 표시된다.
- 한 탭에서 저장 후 다른 stale 탭이 저장하려 하면 충돌 안내가 표시된다.
- 충돌 상태에서 최신 작업본 불러오기와 현재 작업 JSON 백업 CTA가 보인다.
- 390px와 1280px에서 horizontal overflow가 없다.
- console error/warn이 없다.
