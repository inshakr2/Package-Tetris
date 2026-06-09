# Delete Confirmation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 현장 터치 환경에서 실수로 내 공간, 저장된 박스, 이번 작업 박스를 삭제하는 일을 줄인다.

**Architecture:** 삭제 버튼은 즉시 삭제하지 않고 `pendingDelete` 상태를 설정한다. 공통 `DeleteConfirmDialog`가 대상별 안내 문구를 보여주고, 사용자가 위험 버튼을 눌렀을 때만 기존 삭제 함수를 실행한다. 삭제 확인 copy는 `src/lib/workspace/delete-confirmation-copy.ts`의 순수 함수로 관리한다.

**Tech Stack:** Next.js App Router, React client component, TypeScript, native HTML dialog, IndexedDB-only V1 frontend.

---

## Product Decision

적용한다. 현장 사용자는 모바일/태블릿에서 작은 아이콘 버튼을 누를 수 있으므로 삭제는 확인 장치가 필요하다.

검토한 3가지 방법:

1. `window.confirm`
   - 장점: 빠르다.
   - 단점: 문구/스타일/접근성 제어가 낮고 현장 UI와 어울리지 않는다.
2. inline 2단계 확인
   - 장점: dialog 없이 행 안에서 처리 가능하다.
   - 단점: 행별 상태가 늘고 모바일에서 수정/삭제/확인 버튼이 과밀해진다.
3. 공통 confirm dialog
   - 장점: 이미 space dialog 패턴이 있고, 포커스/문구/위험 버튼 위치를 일관되게 제어할 수 있다.
   - 단점: dialog 상태와 focus return 구현이 필요하다.

선택: 3번. 단, V1 범위에서는 undo는 후속으로 두고 확인 dialog만 추가한다.

역할 검토 후 PM 결정:

- business-analyst: 세 삭제 경로 모두 확인이 필요하다고 판단했다. 특히 저장된 박스 삭제는 라이브러리와 현재 작업을 함께 바꿀 수 있다.
- ui-ux-tester: 내 공간/저장된 박스는 confirm이 적합하지만, 이번 작업 박스 제거는 장기적으로 undo가 더 적합하다고 판단했다.
- product-manager: V1은 즉시 삭제보다 안전장치를 우선한다. 세 삭제 경로 모두 confirm을 적용하되, `draft-block`은 "삭제"가 아니라 "이번 작업에서 제거"로 표현해 마찰과 의미 혼동을 낮춘다. 후속 증분 후보로 "작업 박스 제거 undo/toast"를 남긴다.

## External UX Constraints

- W3C APG alertdialog는 중요한 메시지와 응답이 필요한 확인 상황에 적합하다.
- W3C modal dialog 패턴은 삭제처럼 되돌리기 어려운 행동에서 덜 위험한 행동에 focus를 두는 것을 권장한다.
- W3C G168은 데이터 손실을 막기 위해 계속 진행 전 확인 요청을 제공하는 방식을 다룬다.

Sources:
- https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://www.w3.org/WAI/WCAG22/Techniques/general/G168

## Task 1: Delete Confirmation Copy

**Files:**
- Create: `src/lib/workspace/delete-confirmation-copy.ts`
- Test: `src/lib/workspace/delete-confirmation-copy.test.ts`

**Step 1: Write failing tests**

Cases:

- `space`: title `내 공간을 삭제할까요?`, primary `내 공간 삭제`, explains selected fallback.
- `block-template`: title `저장된 박스를 삭제할까요?`, primary `저장된 박스 삭제`, explains current-work removal.
- `draft-block`: title `이번 작업에서 박스를 제거할까요?`, primary `작업에서 제거`, explains saved template remains.

**Step 2: Verify RED**

Run: `npm test -- src/lib/workspace/delete-confirmation-copy.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Implement minimal utility**

```ts
export type DeleteConfirmationKind = "space" | "block-template" | "draft-block";
export function getDeleteConfirmationCopy(kind: DeleteConfirmationKind, itemName: string) { ... }
```

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/workspace/delete-confirmation-copy.test.ts`

Expected: PASS.

## Task 2: Confirm Dialog UI

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Implementation Steps:**

1. Add `PendingDelete` state:
   - `kind: "space" | "block-template" | "draft-block"`
   - id
   - name
2. Add `deleteDialogTriggerRef`.
3. Replace direct delete button handlers with `requestDelete(...)`.
4. Add `confirmPendingDelete()`:
   - calls `deleteSpace`, `deleteBlockTemplate`, or `deleteCurrentBlockItem`
   - closes dialog after action
5. Add `DeleteConfirmDialog`:
   - native `<dialog>` with `role="alertdialog"`
   - `aria-labelledby`, `aria-describedby`
   - cancel button first and initially focused
   - danger primary button for destructive action
   - close button and `Escape` close
6. Add shared `data-overlay-open="true"` to `app-shell` while blocking dialogs are open and hide mobile sticky actions.
7. If a remote/local save conflict appears while a delete dialog is open, keep the dialog closable but disable the destructive confirm action.

## Task 3: Styling

**Files:**
- Modify: `src/app/globals.css`

Rules:

- Reuse dialog visual language from space form dialog where practical.
- Mobile <=767px: bottom sheet style, buttons at least 48px.
- Danger action visually distinct and separated from safe cancel.
- No horizontal overflow at 360px.

## Task 4: Review And Verification

**Commands:**

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

**Browser Checks:**

- 360px and 390px: each delete button opens confirm dialog, sticky hidden while open, no horizontal overflow.
- Cancel/close/Escape leave item intact and return focus to trigger.
- Confirm actually deletes the target.
- Space delete fallback to default pallet remains visible if selected space was deleted.
- Block-template delete removes saved template and current-work draft items that use it.
- Draft-block delete removes only the current-work item and leaves saved template.
- 768px and 1280px: dialog opens centered and workflow remains usable.

## Acceptance Criteria

- Delete buttons no longer perform immediate deletion.
- `내 공간`, `저장된 박스`, `이번 작업 박스` deletion each shows target-specific confirmation copy.
- Dialog has cancel, close, and confirm actions.
- Cancel/close/Escape do not delete anything and return focus to the delete trigger.
- Confirm deletes only the intended target.
- Save-conflict locked state disables destructive confirm while still allowing the dialog to close.
- Mobile sticky action does not overlap or remain clickable while delete dialog is open.
- 360px mobile has no horizontal overflow.
