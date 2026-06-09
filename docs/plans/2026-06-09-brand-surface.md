# Brand Surface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the browser title, PWA metadata, and top header consistently expose `Package Tetris` while keeping Korean field-purpose copy.

**Architecture:** Keep the change limited to metadata, manifest, and header strings. Add a source-level contract test so future V1 polish does not reintroduce the old generic title as the primary app identity. Do not change storage schema, packing behavior, or workflow layout.

**Tech Stack:** Next.js App Router metadata, MetadataRoute manifest, React client component, Node test runner.

---

### Task 1: Brand Surface Test

**Files:**
- Create: `src/lib/workspace/brand-surface.test.ts`
- Read: `src/app/layout.tsx`
- Read: `src/app/manifest.ts`
- Read: `src/components/tetris-workspace-app.tsx`

**Step 1:** Add a failing source contract test that checks:
- metadata `applicationName` and `title` include `Package Tetris`
- manifest `name` and `short_name` include `Package Tetris`
- app header H1 uses `Package Tetris`
- the old `테트리스 적재 최적화` title is not the primary metadata or H1

**Step 2:** Run targeted test:

```bash
node --import tsx --test src/lib/workspace/brand-surface.test.ts
```

Expected: FAIL because current metadata and H1 still use the old generic title.

### Task 2: Brand Surface Implementation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/manifest.ts`
- Modify: `src/components/tetris-workspace-app.tsx`

**Step 1:** Set metadata `applicationName` and `title` to `Package Tetris`.

**Step 2:** Set manifest `name` and `short_name` to `Package Tetris`.

**Step 3:** Change both loading and normal header H1 to `Package Tetris`.

**Step 4:** Keep Korean subtitle/description explaining that the product is an on-site loading optimization tool.

### Task 3: Verification

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

**Browser checks:**
- Verify 1280px, 768px, 390px, 360px widths.
- Confirm browser title is `Package Tetris`.
- Confirm header H1 is visible and no horizontal overflow appears.
