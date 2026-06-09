# Chain Simulation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 결과 화면에서 기존 배치를 잠근 상태로 저장된 블록 유형을 추가로 몇 개 더 넣을 수 있는지 계산하고, 확정 시 결과 좌표와 체이닝 이력을 갱신한다.

**Architecture:** V1 체이닝은 새 공간을 만들지 않고 `latestResult.spaces` 내부의 빈 공간만 대상으로 한다. `src/lib/workspace/chain-simulation.ts`는 충돌 검사, 직교 회전 후보, 기본 지지면 검사를 담당하고, React 화면은 현재 작업 블록 유형 선택, 최대 적재 계산, 확정, 직전 취소, 이력 표시만 담당한다.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Node test runner, IndexedDB workspace persistence.

---

## Product Manager Decision

검토한 3가지 방법:

1. 안내 문구만 제공
   - 구현은 빠르지만 기획서의 추가 블록 시뮬레이션 요구를 충족하지 못한다.
2. 기존 결과 공간 안에서 최대 추가 수량 계산
   - 기존 배치를 잠근다는 요구에 맞고, v0 엔진 좌표를 활용해 검증 가능한 단위로 구현할 수 있다.
3. 새 공간 생성까지 포함한 체이닝 엔진
   - 기능은 넓지만 "남은 빈 공간" 검토 목적이 흐려지고 V1 범위가 커진다.

채택: 2번. 이번 증분은 기존 `PackedSpace` 안에서만 추가 배치한다.

## Task 1: Chain Simulation Utility

**Files:**
- Create: `src/lib/workspace/chain-simulation.ts`
- Create: `src/lib/workspace/chain-simulation.test.ts`
- Modify: `src/lib/workspace/types.ts`

**Step 1: Write failing tests**

- 빈 스트립 공간에 선택 블록을 반복 배치해 최대 수량과 preview spaces를 반환한다.
- 꽉 찬 공간은 추가 가능 수량 0을 반환한다.
- non-fragile 블록은 fragile 지지면 위에 배치하지 않는다.
- fragile 블록은 fragile 지지면 위에 배치할 수 있다.

**Step 2: Implement utility**

- Input: `ResultSummary`, `BlockTemplate`, `runId`.
- Output: `addedQuantity`, `spaces`, `averageUtilizationRate`, `warnings`.
- 직교 회전 후보를 만들고, 기존/추가 블록의 경계 좌표를 candidate position으로 삼는다.
- 후보는 낮은 `z`, 낮은 `y`, 낮은 `x` 순서로 선택한다.
- 배치 조건: usable size 내부, AABB 충돌 없음, `z=0` 또는 하단 면적이 같은 `z`의 블록 top 면에 의해 지지됨.
- fragile 조건: 추가 블록이 non-fragile이면 fragile support 위 배치를 거부한다.

**Step 3: Verify utility**

Run:

```bash
npm test
npx tsc --noEmit
```

## Task 2: Result Screen Chain UI

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Step 1: Wire data**

- `ResultStage`에 `draftBlocks`, `chainHistory`, `onConfirmChainSimulation`, `onUndoLastChainAddition` props를 추가한다.
- parent에서 확정 시 `recentResults[0].spaces`와 `averageUtilizationRate`를 preview 결과로 갱신한다.
- `chainHistory`에는 `chainId`, `resultId`, `blockId`, `blockTemplateId`, `blockName`, `addedQuantity`, `previousSpaces`, `previousAverageUtilizationRate`, `createdAt`을 저장한다.

**Step 2: Build panel**

- 기존 "추가 블록 시뮬레이션" placeholder를 결과 보드 바로 아래 full-width panel로 교체한다.
- 블록 유형 single-select button list, `최대 적재 계산`, `이 결과 반영`, `직전 추가 취소` CTA를 제공한다.
- preview 성공 시 "추가 가능 N개"를 표시한다.
- 0개 가능은 실패가 아니라 중립 안내로 표시한다.
- 확정 후 2D 투영 작업대는 추가된 좌표를 즉시 반영한다.
- `수량 직접 지정`은 V1-small에서 제외한다.

**Step 3: Responsive CSS**

- 데스크톱에서는 하단 카드 안에서 select/result/actions가 2열로 정렬된다.
- 모바일에서는 1열 스택과 큰 CTA를 유지한다.

## Task 3: Planning Document Alignment

**Files:**
- Modify: `docs/tetris-ui-planning-draft.md`

**Step 1: Update V1 initial implementation**

- 추가 블록 시뮬레이션은 기존 결과 공간 안에서만 계산한다고 명시한다.
- 확정 시 chain history와 result preview가 갱신된다고 명시한다.

## Task 4: Verification

Run:

```bash
npm test
npx tsc --noEmit
npm run build
npm audit --audit-level=moderate
```

Browser checks:

- 결과 생성 후 추가 블록 시뮬레이션 패널이 표시된다.
- 블록 유형 선택 후 최대 적재 계산이 가능하다.
- 확정 후 projection block count가 증가하고 chain history가 표시된다.
- 360, 390, 768, 1280, 1440px에서 horizontal overflow가 없다.
- console error/warn이 없다.
