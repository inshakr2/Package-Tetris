# Result Freshness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 결과 생성 후 공간이나 박스 입력이 바뀌면 현장 작업자에게 현재 결과가 이전 입력 기준임을 알려준다.

**Architecture:** 결과 생성 시 현재 입력을 짧은 fingerprint로 저장하고, 화면 렌더 시 현재 입력 fingerprint와 비교한다. 기존 백업/작업본에는 fingerprint가 없을 수 있으므로 `unknown` 상태로 두고 경고를 띄우지 않는다.

**Tech Stack:** Next.js App Router client component, TypeScript 순수 유틸, Node test runner, IndexedDB 작업본, JSON backup.

---

## Context

현장 작업자는 결과 화면을 기준으로 실제 적재를 진행한다. 결과를 만든 뒤 박스 수량, 박스 치수, 깨짐주의 여부, 선택 공간, 안전 여유를 바꾸면 이전 결과와 현재 입력이 달라질 수 있다. 지금 화면은 계산 시각은 보여주지만, 결과가 현재 입력 기준인지 명확히 말하지 않는다.

## Compared Approaches

1. **날짜 비교**
   - `workspace.draft.updatedAt > latestResult.createdAt`이면 오래된 결과로 판단한다.
   - 장점: 구현이 가장 작다.
   - 단점: 추가 박스 시뮬레이션처럼 결과를 갱신하는 후속 행동도 오래된 결과로 오판할 수 있다.

2. **입력 fingerprint 비교**
   - 결과 생성 시 선택 공간과 현재 작업 박스의 핵심 값을 정렬된 문자열로 만들어 저장한다.
   - 장점: 저장 크기가 작고, 실제 입력 변경만 감지할 수 있다.
   - 단점: 기존 결과에는 fingerprint가 없어 판정 보류 상태가 필요하다.

3. **전체 입력 스냅샷 저장**
   - 결과마다 공간, 박스 전체 입력을 별도 객체로 저장한다.
   - 장점: 결과 재현성과 디버깅이 가장 좋다.
   - 단점: V1 백업 파일이 커지고 이번 증분 범위를 넘는다.

## Decision

2번을 적용한다. `ResultSummary.inputFingerprint?: string`을 추가하고, `createResultInputFingerprint`와 `createResultFreshnessState` 순수 유틸을 만든다. 결과가 오래됐을 때 결과 헤더 아래에 `입력이 바뀌었습니다` 상태 배너를 보여주고 `결과 다시 만들기` 버튼을 제공한다. 접근성 기준으로 배너는 `role="status"`를 사용한다.

## Role Review

- product-manager: 오래된 결과를 현장 적재 기준으로 오인하는 위험을 줄인다.
- business-analyst: 공간/박스 변경 후 재계산 필요 여부를 작업자가 즉시 알 수 있다.
- ui-designer: 기존 KPI와 3D 뷰어를 밀어내지 않는 얇은 상태 배너로 배치한다.
- ui-ux-tester: 모바일 360px에서 배너와 CTA가 한 컬럼으로 내려가며 가로 넘침이 없어야 한다.
- nextjs-developer: optional field로 백업 호환성을 유지하고, 비교 로직은 순수 함수로 테스트한다.

## External References

- W3C WCAG 2.2 Status Messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- MDN ARIA status role: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role

## Tasks

### Task 1: Result Freshness Helper

**Files:**
- Create: `src/lib/workspace/result-freshness.ts`
- Test: `src/lib/workspace/result-freshness.test.ts`
- Modify: `src/lib/workspace/types.ts`

**Step 1:** Write failing tests for matching, stale, and unknown fingerprint states.

**Step 2:** Run `node --import tsx --test src/lib/workspace/result-freshness.test.ts` and verify RED.

**Step 3:** Implement `createResultInputFingerprint` and `createResultFreshnessState`.

**Step 4:** Re-run the targeted test and verify GREEN.

### Task 2: Result UI Banner

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`
- Create: `src/lib/workspace/result-freshness-layout.test.ts`

**Step 1:** Write a static layout test that expects a `result-freshness-banner`, 현장 문구, `role="status"`, and mobile one-column CSS.

**Step 2:** Run the layout test and verify RED.

**Step 3:** Store `inputFingerprint` when creating a result and render stale-state banner with `결과 다시 만들기`.

**Step 4:** Add CSS for compact desktop and single-column mobile layout.

**Step 5:** Re-run targeted tests and then full verification.

## Verification

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run build`
4. Browser verification at 360px, 390px, 768px, 1280px:
   - no horizontal overflow
   - stale banner does not appear for the current saved result
   - result meta still appears
   - 3D host reaches `data-render-state="ready"`
   - no console errors
