# Constrained Block Priority Packing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 같은 안전 규칙 안에서 회전/배치 선택지가 적은 박스를 먼저 배치해 불필요한 공간 분리를 줄인다.

**Architecture:** 기존 `runPackingEngineV0`의 결정론적 greedy 구조와 `findFirstStablePlacement` 안전 규칙은 유지한다. 블록 단위 정렬 시 같은 fragile 그룹 안에서 회전 후보 수가 적은 박스를 먼저 배치하고, 회전 후보 수가 같을 때 기존 최대 바닥면적, 부피, `blockId` 순 정렬을 유지한다.

**Tech Stack:** TypeScript 순수 엔진 유틸, Node test runner, Next.js static frontend.

---

## Context

안전 게이트로 잘못된 좌표를 차단했으므로, 다음 PM 우선순위는 같은 안전 조건 안에서 실제 사용 공간 수를 줄이는 것이다. 현재 엔진은 non-fragile을 먼저 두고, 같은 그룹 안에서는 회전 가능한 후보 중 최대 바닥면적이 큰 박스를 우선한다. 이 방식은 넓은 받침면을 먼저 까는 데 유리하지만, 특정 케이스에서는 회전 선택지가 적은 박스를 뒤로 밀어 새 공간을 더 쓰게 만든다.

## Compared Approaches

1. **전체 탐색/백트래킹**
   - 여러 순서를 탐색해 최적에 가까운 결과를 고른다.
   - 장점: 품질 개선 폭이 크다.
   - 단점: 계산 시간과 구현 복잡도가 커지고 V1 검증 범위가 넓어진다.

2. **후보 위치 scoring 고도화**
   - 같은 박스를 어디에 둘지 residual space나 bounding footprint로 평가한다.
   - 장점: 개별 배치 품질을 직접 개선한다.
   - 단점: 현재 안정성 후보 선택과 충돌할 수 있어 회귀 테스트가 많이 필요하다.

3. **제약 박스 우선 정렬**
   - 회전 후보 수가 적은 박스를 먼저 배치한다.
   - 장점: 구현 범위가 작고, 기존 안전 규칙을 그대로 사용한다.
   - 단점: 모든 입력에서 최적을 보장하지는 않는 휴리스틱이다.

## Decision

3번을 적용한다. `SortableBlockUnit`에 `rotationCandidateCount`를 추가하고 `compareBlockUnits`에서 fragile 정책 다음 우선순위로 둔다. 회전 후보 수가 같으면 기존의 최대 바닥면적 우선 정렬을 그대로 유지한다.

## Role Review

- product-manager: 안전성을 유지하면서 공간 수를 줄이는 저위험 품질 개선이다.
- business-analyst: 현장에서는 공간 수가 줄어드는 것이 차량/파레트 수와 직결되므로 가치가 있다.
- code-reviewer: 전역 최적화처럼 큰 변경을 피하고, 결정론 정렬 규칙만 확장한다.
- ui-ux-tester: UI 변경은 없지만 기존 결과 화면과 3D ready 상태는 회귀 검증한다.
- nextjs-developer: 순수 엔진 테스트를 RED/GREEN으로 추가하고 전체 빌드 검증을 유지한다.

## External References

- Extreme Point-Based Heuristics for Three-Dimensional Bin Packing: https://pubsonline.informs.org/doi/10.1287/ijoc.1070.0250
- Integrating Heuristic Methods with Deep Reinforcement Learning for Online 3D Bin-Packing Optimization: https://www.mdpi.com/1424-8220/24/16/5370

## Tasks

### Task 1: Constrained Block Ordering Test

**Files:**
- Modify: `src/lib/workspace/packing-engine.test.ts`

- [ ] **Step 1:** Add a failing test where current max-base-area ordering uses 5 spaces but constrained-first ordering can use 4 spaces.
- [ ] **Step 2:** Run `node --import tsx --test src/lib/workspace/packing-engine.test.ts` and verify RED.

### Task 2: Engine Sorting Heuristic

**Files:**
- Modify: `src/lib/workspace/packing-engine.ts`

- [ ] **Step 1:** Add `rotationCandidateCount` to `SortableBlockUnit`.
- [ ] **Step 2:** Populate it from `createRotationCandidates(block.dimensions, usableSize).length`.
- [ ] **Step 3:** Update `compareBlockUnits` to sort by fragile group, then lower `rotationCandidateCount`, then existing `maxBaseAreaMm2`, `volumeM3`, `blockId`.
- [ ] **Step 4:** Re-run targeted tests and full verification.

## Verification

1. `node --import tsx --test src/lib/workspace/packing-engine.test.ts`
2. `npm test`
3. `npx tsc --noEmit`
4. `npm run build`
5. Browser verification at 360px, 390px, 768px, 1280px:
   - no horizontal overflow
   - existing result still renders 3D ready
   - no console errors
