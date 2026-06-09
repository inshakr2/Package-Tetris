# Result Backup CTA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 결과를 만든 직후 현장 작업자가 결과 요약 근처에서 바로 백업 파일을 만들 수 있게 한다.

**Architecture:** 기존 `ResultStage`에 `needsExport`를 전달한다. 결과가 있고 백업이 최신이 아닐 때만 `result-backup-callout`을 결과 KPI 바로 아래에 표시한다. CTA는 기존 `exportJson` 흐름을 재사용하며 저장/가져오기/3D 렌더링 로직은 변경하지 않는다.

**Tech Stack:** Next.js App Router static export, React client component, IndexedDB workspace state, JSON export, Node test runner.

---

## Compared Approaches

1. 상단 저장 상태와 모바일 sticky action만 유지
   - 이미 동작하지만 결과를 확인하는 위치와 백업 행동이 떨어져 있다.
2. 결과가 있으면 항상 백업 버튼 표시
   - 접근성은 좋지만 이미 최신 백업을 만든 상태에도 반복 표시되어 경고 피로가 생긴다.
3. 결과가 있고 `needsExport`일 때 결과 요약 아래 CTA 표시
   - 결과 확인 직후 필요한 행동을 보여주고, 최신 상태에서는 조용히 사라진다.

채택: 3번.

## Role Review

- business-analyst: V1은 서버 없이 로컬 작업본과 백업 파일로 운영하므로, 결과 생성 직후 백업 행동이 결과 흐름 안에 보여야 한다.
- ui-designer: 결과 영역은 메인 화면이므로 CTA는 요약 바로 아래에 한 줄 callout으로 배치한다. 모바일에서는 한 컬럼으로 내려 48px 버튼을 유지한다.
- ui-ux-tester: 360px/390px에서 텍스트와 버튼이 가로 넘침 없이 줄바꿈되어야 한다. 기존 sticky action과 중복되더라도 결과 근처 CTA는 맥락상 유효하다.
- nextjs-developer: 기존 `exportJson`과 `needsExport` 계산을 재사용한다. 저장소 스키마나 import/export 포맷은 변경하지 않는다.

## Task 1: RED Test

**Files:**
- Create: `src/lib/workspace/result-backup-action-layout.test.ts`

**Steps:**
1. `ResultStage`가 `needsExport` prop을 받고 `result-backup-callout`을 렌더링해야 한다는 테스트를 작성한다.
2. callout이 `백업 파일 만들기` 버튼과 `onExportJson` 연결을 포함해야 한다는 테스트를 작성한다.
3. CSS에서 모바일 한 컬럼과 48px 터치 타깃을 요구한다.
4. `node --import tsx --test src/lib/workspace/result-backup-action-layout.test.ts`로 실패를 확인한다.

## Task 2: Implementation

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Steps:**
1. parent `ResultStage` 호출에 `needsExport={needsExport}`를 전달한다.
2. `ResultStage` prop 타입에 `needsExport`를 추가한다.
3. `latestResult && needsExport`일 때 결과 KPI 아래에 callout을 렌더링한다.
4. 버튼은 `onExportJson`을 호출하고 48px 이상 터치 타깃을 유지한다.

## Task 3: Verification

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- Browser 360px, 390px, 768px, 1280px: 결과 영역 가로 넘침 없음, 3D ready, 백업 CTA 버튼 48px 이상

## Sources

- MDN Storage quotas and eviction criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- W3C WCAG 2.2 Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
