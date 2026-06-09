# Package Tetris Naming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename user-facing `my-tetris` file names and project metadata to `Package Tetris` / `package-tetris` while preserving existing browser workspaces.

**Architecture:** Keep visible download names in small pure helpers so tests can verify the exact filenames. Rename the default IndexedDB database to `package-tetris`, but load and migrate the legacy `my-tetris` database on first startup so existing local work is not lost. Keep JSON import schema unchanged for V1 backup compatibility.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Node test runner, fake-indexeddb, IndexedDB.

---

### Task 1: File Name Tests

**Files:**
- Modify: `src/lib/workspace/loading-instruction-file.test.ts`
- Create: `src/lib/workspace/workspace-backup-file.test.ts`

**Step 1:** Change expected loading instruction filenames from `my-tetris-...` to `package-tetris-...`.

**Step 2:** Add a pure test for `createWorkspaceBackupFilename(new Date(2026, 5, 9))`.

**Step 3:** Run targeted tests and verify they fail because implementation still uses old names.

### Task 2: File Name Implementation

**Files:**
- Modify: `src/lib/workspace/loading-instruction-file.ts`
- Create: `src/lib/workspace/workspace-backup-file.ts`
- Modify: `src/components/tetris-workspace-app.tsx`

**Step 1:** Return `package-tetris-...-loading-YYYY-MM-DD.txt` from loading instruction filename helper.

**Step 2:** Add `createWorkspaceBackupFilename(date)` returning `package-tetris-library-YYYY-MM-DD.json`.

**Step 3:** Use the helper in `exportJson()`.

### Task 3: Persistence Naming Compatibility

**Files:**
- Modify: `src/lib/persistence/indexed-db.ts`
- Modify: `src/lib/persistence/indexed-db.test.ts`
- Modify: `src/lib/persistence/workspace-sync-channel.ts`
- Modify: `src/lib/persistence/workspace-sync-channel.test.ts`

**Step 1:** Add a failing test that a `package-tetris-test` storage instance can load and migrate a workspace stored in legacy `my-tetris-test`.

**Step 2:** Change the default DB name to `package-tetris` and support a legacy fallback DB name.

**Step 3:** Rename the sync channel to `package-tetris-workspace-sync` and update the test expectation.

### Task 4: Docs And Metadata

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/field-demo-user-guide.md`
- Modify: `docs/plans/2026-06-09-loading-instruction-space-filename.md`

**Step 1:** Rename package metadata to `package-tetris`.

**Step 2:** Replace remaining user-facing folder/file examples with `Package-Tetris` or `package-tetris`.

### Task 5: Verification

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

**Browser checks:**
- Open the local app on desktop and mobile widths.
- Confirm the app renders, no horizontal overflow is visible, and the result area remains accessible.
