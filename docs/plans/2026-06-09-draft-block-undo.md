# Draft Block Undo Implementation Plan

**Goal:** 현장 작업자가 현재 작업 박스를 잘못 제거했을 때 화면 안에서 즉시 복구할 수 있게 한다.

**Architecture:** `내 공간`과 `저장된 박스` 삭제는 기존 confirm dialog를 유지한다. 영향 범위가 이번 작업으로 한정되는 `draft-block`만 즉시 제거하고, 제거된 `DraftBlockItem` 스냅샷과 원래 위치를 임시 상태에 보관해 toast의 `되돌리기` 버튼으로 복구한다. 복구 로직은 `src/lib/workspace/block-library.ts`의 순수 함수로 관리한다.

**Tech Stack:** Next.js App Router, React client component, TypeScript, IndexedDB-only V1 frontend.

---

## Product Decision

적용한다. 직전 삭제 확인 dialog 증분에서 `draft-block`도 안전하게 confirm을 거치도록 만들었지만, UI-UX tester는 현재 작업 박스 제거가 반복 정리 동작일 가능성이 높아 confirm보다 undo가 더 적합하다고 판단했다. BA도 `undo/toast`를 다음 우선 증분으로 제안했다.

검토한 3가지 방법:

1. confirm 유지 + undo toast
   - 장점: 실수 방지와 복구를 모두 제공한다.
   - 단점: 삭제 전 확인과 삭제 후 되돌리기를 모두 거쳐 반복 작업 마찰이 커진다.
2. `draft-block`만 즉시 제거 + undo toast
   - 장점: 저장된 원본에는 영향이 없고, 반복 정리 흐름이 빠르며, 실수는 바로 복구할 수 있다.
   - 단점: 기존 confirm 정책에서 대상별 정책으로 분기된다.
3. 변경 없음
   - 장점: 구현 범위가 없다.
   - 단점: 직전 리뷰에서 확인된 반복 마찰을 방치한다.

선택: 2번. `내 공간`과 `저장된 박스`는 자산 삭제라 confirm을 유지하고, `이번 작업 박스`만 즉시 제거 + undo toast로 전환한다.

## Task 1: Restore Utility

**Files:**
- Modify: `src/lib/workspace/block-library.ts`
- Modify: `src/lib/workspace/block-library.test.ts`

Steps:

1. `restoreDraftBlockItem(workspace, { item, index, now })`를 추가한다.
2. 테스트를 먼저 추가한다.
   - 제거된 draft item을 기존 순서로 복구한다.
   - 같은 `draftBlockItemId`가 이미 있으면 중복 복구하지 않는다.
   - 연결된 block template이 없으면 복구하지 않는다.
3. 복구 시 `revision`, `updatedAt`, `draft.updatedAt`, `draft.currentStep`을 작업 입력 단계에 맞게 갱신한다.

## Task 2: App State And Actions

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`

Steps:

1. `PendingDraftUndo` 상태를 추가한다.
   - removed item
   - block name
   - original index
   - createdAt
2. `draft-block` 삭제 요청은 confirm dialog를 열지 않고 `deleteCurrentBlockItemWithUndo`를 실행한다.
3. 삭제 전 현재 workspace에서 대상 draft item과 index를 찾고, 삭제 성공 후 undo 상태를 표시한다.
4. `undoDraftBlockRemoval()`은 saveConflict 상태에서는 실행하지 않고 안내를 유지한다.
5. 새 draft-block 제거가 발생하면 toast는 최신 제거 항목으로 갱신한다.
6. block template 삭제가 발생하면 관련 undo 상태를 닫는다.

## Task 3: Toast UI

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

Rules:

- 문구: `이번 작업에서 제거했습니다.`
- 보조 문구: 제거된 박스명을 표시한다.
- 액션: `되돌리기`
- 닫기 버튼을 제공한다.
- 모바일에서는 하단 sticky action 바로 위에 표시하고, safe area를 고려한다.
- 버튼 높이는 최소 48px에 가깝게 유지한다.
- horizontal overflow가 없어야 한다.

## Task 4: Review And Verification

Commands:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

Browser checks:

- `이번 작업에서 제거` 클릭 시 confirm dialog 없이 draft item이 제거되고 toast가 표시된다.
- `되돌리기` 클릭 시 기존 수량과 순서로 복구된다.
- 저장된 박스 라이브러리는 제거와 되돌리기 동안 유지된다.
- 새 제거를 하면 toast가 최신 항목으로 갱신된다.
- 내 공간/저장된 박스 삭제는 기존 confirm dialog를 유지한다.
- 360px, 390px에서 toast가 sticky action과 겹치지 않고 horizontal overflow가 없다.
- saveConflict 상태에서는 undo가 실행되지 않는다.

## Acceptance Criteria

- `draft-block` 제거는 즉시 실행되고 undo toast를 표시한다.
- undo는 같은 화면 세션 안에서 제거된 항목을 원래 위치와 수량으로 복구한다.
- undo는 라이브러리 템플릿이 남아 있을 때만 복구한다.
- `내 공간`, `저장된 박스` 삭제 confirm은 유지된다.
- 모바일에서 toast와 sticky action이 서로 가리지 않는다.
