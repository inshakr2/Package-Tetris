# Space Form Dialog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 1번 적재 공간 선택 영역에서 커스텀 공간 입력 폼을 상시 노출하지 않고, 버튼으로 여는 간단한 dialog/sheet로 분리한다.

**Architecture:** 기존 `SpaceForm`과 `saveSpace` 데이터 흐름은 유지한다. 상위 앱 상태에 `spaceDialogOpen`을 추가하고, `SpaceLibraryPanel`은 폼을 직접 렌더링하지 않고 추가/수정 진입 버튼과 compact 내 공간 목록만 렌더링한다. `SpaceFormDialog`는 native `<dialog>`를 사용해 modal 동작을 제공하고 CSS로 모바일에서는 bottom sheet처럼 보이게 한다.

**Tech Stack:** Next.js App Router, React client component, TypeScript, native HTML dialog, IndexedDB-only V1 frontend.

---

## Product Decision

사용자 제안은 적용한다. `커스텀 공간 추가`는 주 사용 흐름이 아니라 보조 작업이므로 기본 화면을 차지하지 않게 한다. 다만 범위는 좁힌다.

- 적용: `내 공간 추가`와 기존 `수정`을 같은 dialog/sheet로 이동한다.
- 유지: `선택된 공간 요약`과 `내 공간 관리` compact list는 1번 영역에 남긴다.
- 후속: 기본 공간의 `이 크기로 내 공간 만들기`, 삭제 확인/undo UX는 다음 사이클 후보로 분리한다.

## External UX Constraints

- W3C APG modal dialog 기준: 열림 시 focus가 dialog 내부로 이동하고, `Escape` 닫기, 닫기 버튼, 닫힌 뒤 trigger로 focus return이 필요하다.
- HTML `dialog`는 `showModal()` 사용 시 focus 이동, 외부 상호작용 차단, focus 제한을 브라우저가 일부 처리한다.
- 모바일 현장 UX 기준: 하단 sticky action과 dialog action이 겹치지 않아야 한다.

## Task 1: Dialog Copy Utility

**Files:**
- Create: `src/lib/workspace/space-dialog-copy.ts`
- Test: `src/lib/workspace/space-dialog-copy.test.ts`

**Step 1: Write failing tests**

- add 모드는 title `내 공간 추가`, primary `추가하고 선택`, helper를 반환한다.
- edit 모드는 title `내 공간 수정`, primary `수정 저장`, helper를 반환한다.

**Step 2: Verify RED**

Run: `npm test -- src/lib/workspace/space-dialog-copy.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Implement minimal utility**

Use a tiny pure function:

```ts
export type SpaceDialogMode = "add" | "edit";
export function getSpaceDialogCopy(mode: SpaceDialogMode) { ... }
```

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/workspace/space-dialog-copy.test.ts`

Expected: PASS.

## Task 2: Move Space Form Into Dialog

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Implementation Steps:**

1. Add `spaceDialogOpen` state and `spaceDialogTriggerRef`.
2. Add handlers:
   - `openAddSpaceDialog`: reset edit state/form, open dialog.
   - `openEditSpaceDialog`: set edit state/form from selected row, open dialog.
   - `closeSpaceDialog`: close dialog, clear edit state/form, return focus to trigger.
   - `saveSpaceAndClose`: call existing save logic, then close dialog.
3. Change `SpaceLibraryPanel` props:
   - Remove direct `form`, `onFormChange`, `onSave`, `onCancelEdit`.
   - Add `onOpenAdd`, `onOpenEdit`.
   - Keep `customSpaces`, `onDelete`, `selectedSpace`.
4. Replace inline `SpaceForm` area with compact actions:
   - Primary button: `내 공간 추가`
   - Summary helper: `기본값이 맞지 않을 때 직접 공간 크기를 저장합니다.`
   - Custom rows keep `수정` and delete button.
5. Add `SpaceFormDialog` component near `SpaceForm`.
   - Uses `<dialog className="space-form-dialog">`.
   - Calls `showModal()` when open.
   - Closes on `cancel`, close button, cancel button.
   - Form content is existing `SpaceForm`.
   - Primary button calls `onSave`.
6. When dialog is open, add `data-space-dialog-open="true"` to `app-shell` and hide `.sticky-mobile-actions` on mobile.

## Task 3: Styling

**Files:**
- Modify: `src/app/globals.css`

**Rules:**

- Desktop/tablet: centered dialog width `min(640px, calc(100vw - 32px))`.
- Mobile <=767px: bottom sheet style, width full, max height `90dvh`, rounded top corners.
- Dialog body scrolls if content is tall.
- Dialog action buttons are at least 48px high.
- Backdrop dims page without hiding dialog content.
- No horizontal overflow at 360px.

## Task 4: Review And Verification

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

**Browser Checks:**
- 360px and 390px: 1번 영역 no longer shows the full custom space form by default.
- 360px and 390px: `내 공간 추가` opens bottom sheet, sticky action is hidden while open, no horizontal overflow.
- 360px and 390px: save creates/selects the new space and closes the sheet.
- 768px: dialog opens centered or sheet-like without breaking layout; focus stays usable.
- 1280px: desktop workflow unaffected; sticky remains hidden.

## Acceptance Criteria

- 1번 영역 기본 화면에서 `SpaceForm`은 상시 노출되지 않는다.
- `내 공간 추가` 버튼은 1번 영역에서 즉시 찾을 수 있다.
- `내 공간 추가`를 누르면 공간명, 크기, 안전 여유를 입력하는 dialog/sheet가 열린다.
- `수정`을 누르면 같은 dialog/sheet가 `내 공간 수정` 상태로 열리고 기존 값이 채워진다.
- 저장 성공 시 dialog/sheet가 닫히고 추가/수정된 공간이 선택된다.
- 유효하지 않은 공간 크기 또는 안전 여유 입력은 저장되지 않고 dialog/sheet 안에 이유가 보인다.
- 저장 충돌 상태에서는 내 공간 저장 버튼이 막히고 dialog/sheet가 닫히지 않는다.
- 취소, 닫기 버튼, Escape로 닫을 수 있다.
- 닫힌 뒤 focus는 열었던 버튼으로 돌아간다.
- dialog/sheet가 열린 동안 모바일 하단 sticky action은 겹치거나 눌리지 않는다.
- 모바일 360px에서 dialog/sheet와 기본 1번 영역 모두 horizontal overflow가 없다.
