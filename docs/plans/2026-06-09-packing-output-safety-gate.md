# Packing Output Safety Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최초 결과 생성에서도 공중에 뜨거나 겹치는 안전하지 않은 적재 결과가 저장·표시되지 않도록 마지막 검증 게이트를 추가한다.

**Architecture:** `runPackingEngineV0`의 배치 후보 생성 로직은 유지한다. 엔진 출력 직후 `validatePackedSpace`를 재사용해 모든 결과 공간을 검증하고, 실패 시 안전하지 않은 좌표를 폐기한 fallback output을 반환한다. UI는 기존 미적재/경고 callout을 그대로 사용해 작업자가 안전하지 않은 결과를 3D로 보지 않게 한다.

**Tech Stack:** TypeScript 순수 유틸, Node test runner, Next.js client workspace, IndexedDB 작업본, Three.js 결과 뷰어.

---

## Context

사용자는 실제 화물을 쌓는 현장 작업자다. 따라서 최적화 결과가 조금 덜 효율적인 것보다, 공중에 떠 있거나 겹치는 블록이 3D에 표시되는 것이 더 위험하다. 현재 체이닝 계산은 기존 결과에 `validatePackedResult`를 적용하지만, 최초 `결과 만들기` 흐름은 엔진 출력 후 안전 검증 게이트가 없다.

## Root Cause

- `findFirstStablePlacement`와 `canPlaceAt`은 후보 단위 안정성을 확인한다.
- `runPackingEngineV0`은 모든 박스를 배치한 뒤 결과 전체를 다시 검증하지 않는다.
- 따라서 향후 엔진 변경, 가져온 데이터, 유틸 회귀가 생기면 안전하지 않은 좌표가 결과 화면까지 도달할 수 있다.

## Compared Approaches

1. **엔진 알고리즘 전면 교체**
   - Extreme point, layer-building, mixed heuristic 같은 구조로 바꾼다.
   - 장점: 적재율 개선 가능성이 크다.
   - 단점: V1 범위를 크게 넘고 회귀 위험이 높다.

2. **엔진 출력 안전 게이트**
   - 배치 결과 생성 후 모든 공간을 다시 검증한다.
   - 장점: 작은 변경으로 “잘못된 결과 표시 금지”를 강하게 보장한다.
   - 단점: 적재율 자체를 개선하지는 않는다.

3. **UI 경고만 추가**
   - 안전하지 않은 결과도 표시하되 경고를 띄운다.
   - 장점: 구현은 가장 작다.
   - 단점: 현장 작업자가 위험한 3D를 보고 따라 할 수 있다.

## Decision

2번을 적용한다. `ensureSafeOptimizationOutput(input, output)` 순수 유틸을 만들고 `runPackingEngineV0` 반환 직전에 호출한다. 검증 실패 시:

- `spaces`는 빈 배열로 바꾼다.
- `usedSpaceCount`, `averageUtilizationRate`는 `0`으로 바꾼다.
- `unloadedBlockCount`는 입력 박스 총 수량 이상으로 보정한다.
- 기존 경고를 유지하고 `UNSAFE_PACKING_RESULT_WARNING`을 추가한다.

이 방식은 잘못된 좌표를 화면에 노출하지 않고, 기존 미적재/경고 UI를 통해 재입력 또는 재계산 행동으로 연결한다.

## Role Review

- product-manager: 이번 증분은 최적화율 개선보다 안전하지 않은 결과 차단을 우선한다.
- business-analyst: 현장에서는 “계산 결과가 이상하면 따라 하지 않는다”가 명확해야 한다.
- ui-designer: 새 UI를 추가하지 않고 기존 미적재 안내 문구에 안전 실패 이유를 합류시켜 화면 복잡도를 늘리지 않는다.
- ui-ux-tester: 실패 fallback에서는 3D 결과가 표시되지 않아야 하며, 결과 화면에는 경고와 미적재 상태가 읽혀야 한다.
- nextjs-developer: 저장 스키마를 바꾸지 않고 순수 유틸과 정적 연결 테스트로 회귀를 막는다.

## External References

- 3D Offline Packing Algorithm considering Cargo Orientation and Stability: https://onlinelibrary.wiley.com/doi/10.1155/2023/5299891
- Three-dimensional container loading models with cargo stability and load bearing constraints: https://www.sciencedirect.com/science/article/pii/S0305054810001486

## Tasks

### Task 1: Safety Gate Utility

**Files:**
- Create: `src/lib/workspace/packing-output-safety.ts`
- Test: `src/lib/workspace/packing-output-safety.test.ts`

- [ ] **Step 1:** Write failing tests for valid pass-through, floating-block rejection, and warning de-duplication.
- [ ] **Step 2:** Run `node --import tsx --test src/lib/workspace/packing-output-safety.test.ts` and verify RED.
- [ ] **Step 3:** Implement `ensureSafeOptimizationOutput` and `UNSAFE_PACKING_RESULT_WARNING`.
- [ ] **Step 4:** Re-run the targeted test and verify GREEN.

### Task 2: Engine Integration

**Files:**
- Modify: `src/lib/workspace/packing-engine.ts`
- Create: `src/lib/workspace/packing-output-safety-gate.test.ts`

- [ ] **Step 1:** Write a static connection test that asserts `runPackingEngineV0` imports and calls `ensureSafeOptimizationOutput`.
- [ ] **Step 2:** Run the static test and verify RED.
- [ ] **Step 3:** Call `ensureSafeOptimizationOutput(input, output)` at the end of `runPackingEngineV0`.
- [ ] **Step 4:** Re-run targeted tests and then full verification.

## Verification

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run build`
4. Browser verification at 360px, 390px, 768px, 1280px:
   - no horizontal overflow
   - existing valid result still shows 3D ready
   - result warning area remains readable
   - no console errors
