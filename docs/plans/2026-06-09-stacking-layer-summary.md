# Stacking Layer Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 결과 화면에서 선택한 공간의 적재 층을 아래층부터 요약해 현장 작업자가 실제로 쌓는 순서를 빠르게 확인할 수 있게 한다.

**Architecture:** `PackedSpace.blocks`를 `zMm` 기준으로 그룹화하는 순수 유틸을 만든다. `ResultStage`는 선택된 공간을 기준으로 층별 요약을 계산하고, 결과 하단에 읽기 전용 안내 패널을 렌더링한다. 3D/2D 렌더링과 적재 엔진은 변경하지 않는다.

**Tech Stack:** Next.js App Router client component, TypeScript 순수 유틸, Node test runner, IndexedDB 작업본, JSON backup.

---

## Context

현장 작업자는 결과 화면에서 박스가 실제로 어떻게 쌓이는지 이해해야 한다. 3D와 2D 투영은 위치 파악에 좋지만, 모바일이나 태블릿 현장 화면에서는 "몇 층부터 어떤 박스를 올릴지"를 바로 읽는 보조 정보가 필요하다. 특히 이전에 사용자가 지적한 공중에 떠있는 박스 문제는 최적화 정합성 검증에서 별도로 다뤄야 하지만, UI도 결과를 층 단위로 확인할 수 있게 해야 이후 검수 흐름이 자연스럽다.

## Compared Approaches

1. **전체 좌표 테이블**
   - 모든 박스의 `x/y/z`, 회전, 치수를 표로 보여준다.
   - 장점: 디버깅과 상세 검수에 좋다.
   - 단점: 모바일에서 가로 스크롤이 늘고, 현장 작업자에게 너무 기술적이다.

2. **층별 적재 요약**
   - 선택 공간의 박스를 `zMm` 기준으로 묶고 아래층부터 대표 박스명과 수량을 보여준다.
   - 장점: 현장 언어와 모바일 UX에 맞고, 기존 결과 데이터를 그대로 활용한다.
   - 단점: 같은 높이 안의 좌우 순서는 설명하지 않는다.

3. **박스별 순차 적재 리스트**
   - 박스 하나하나를 정렬해 `1번, 2번, 3번` 순서로 보여준다.
   - 장점: 실제 작업 지시서에 가장 가깝다.
   - 단점: 박스 수가 많을 때 화면이 길어지고, 좌표 기반 순서 규칙 설계가 별도 과제가 된다.

## Decision

2번을 적용한다. 이번 증분은 선택 공간 기준의 `쌓는 순서` 패널을 추가하고, 각 층은 `1층 · 바닥층`, `2층 · 180mm 높이`처럼 현장 작업자가 읽을 수 있는 문구로 표시한다. 같은 층의 박스 유형은 수량이 많은 순으로 최대 두 종류까지 노출하고, 나머지는 `외 N종`으로 줄인다.

## Role Review

- product-manager: 최적화 엔진을 바꾸지 않고도 결과 해석성을 높이는 저위험 증분이다.
- business-analyst: 현장 작업자는 좌표보다 층과 박스 종류를 우선 확인하므로 업무 언어에 맞다.
- ui-designer: 결과 하단의 보조 패널로 배치해 3D 메인 영역을 방해하지 않는다.
- ui-ux-tester: 320px 이상 모바일 폭에서 한 컬럼으로 리플로우되어야 하고, 긴 박스명은 줄바꿈되어야 한다.
- nextjs-developer: 순수 유틸과 정적 레이아웃 테스트로 회귀를 막고, 저장 스키마 변경은 하지 않는다.

## External References

- W3C WCAG 2.2 Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- W3C WCAG 2.2 Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## Tasks

### Task 1: Stacking Layer Helper

**Files:**
- Create: `src/lib/workspace/stacking-layer-summary.ts`
- Test: `src/lib/workspace/stacking-layer-summary.test.ts`

**Step 1:** Write failing tests for bottom-to-top layer ordering, same-layer type aggregation, hidden type count, and empty packed space.

**Step 2:** Run `node --import tsx --test src/lib/workspace/stacking-layer-summary.test.ts` and verify RED.

**Step 3:** Implement `createStackingLayerSummaries`.

**Step 4:** Re-run the targeted test and verify GREEN.

### Task 2: Result UI Panel

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`
- Create: `src/lib/workspace/stacking-layer-summary-layout.test.ts`

**Step 1:** Write a static layout test that expects the helper import, `쌓는 순서`, selected-space copy, layer classes, and mobile wrapping CSS.

**Step 2:** Run the layout test and verify RED.

**Step 3:** Render a `stacking-layer-panel` inside `result-lower-grid` using the selected packed space.

**Step 4:** Add CSS for readable layer rows, `overflow-wrap: anywhere`, and one-column mobile behavior.

**Step 5:** Re-run targeted tests and then full verification.

## Verification

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run build`
4. Browser verification at 360px, 390px, 768px, 1280px:
   - no horizontal overflow
   - `쌓는 순서` 패널이 결과 하단에 표시됨
   - 선택 공간을 바꾸면 패널의 Space 번호가 바뀜
   - 3D host reaches `data-render-state="ready"`
   - no console errors
