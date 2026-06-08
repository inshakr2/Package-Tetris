# Mobile Sticky Action Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모바일 하단 고정 액션에서 현장 작업자가 현재 상태, 막힌 이유, 다음 행동 1개를 바로 확인하게 만든다.

**Architecture:** React 컴포넌트 내부 조건문을 늘리지 않고 `src/lib/workspace`의 순수 함수가 sticky action view model을 계산한다. UI는 이 view model을 렌더링하고, 기존 저장 pill과 결과 생성/백업/최신본 동작은 그대로 사용한다.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Vitest-style Node test runner, IndexedDB-only V1 frontend.

---

## Product Decision

### 검토한 3가지 방법

1. 컴포넌트 내부 조건문만 보강한다.
   - 장점: 변경량이 작다.
   - 단점: 모바일 CTA 상태를 테스트하기 어렵고 기존 JSX 조건문이 더 복잡해진다.
2. 순수 view model 유틸을 추가하고 UI는 렌더링만 맡긴다.
   - 장점: 현장 문구, disabled 이유, action 분기를 테스트로 고정할 수 있다.
   - 단점: 작은 파일이 하나 늘어난다.
3. 전체 워크플로우 상태머신을 도입한다.
   - 장점: 장기적으로 단계 관리가 명확하다.
   - 단점: V1 모바일 sticky 보강 범위를 넘고 회귀 위험이 크다.

선택: 2번. 이번 증분의 목적은 현장 사용자가 모바일에서 다음 행동을 즉시 이해하는 것이며, 순수 유틸이 가장 작은 변경으로 요구사항과 검증 가능성을 모두 만족한다.

## Task 1: Sticky Action View Model

**Files:**
- Create: `src/lib/workspace/mobile-sticky-action.ts`
- Test: `src/lib/workspace/mobile-sticky-action.test.ts`

**Step 1: Write failing tests**

- 잠긴 작업본이면 `최신본` action과 최신본 필요 상태를 반환한다.
- 결과가 없고 실행 전 검토가 통과되면 `결과 만들기` action을 반환한다.
- 결과가 없고 실행 전 검토가 막히면 helper에 막힌 이유를 보여주고 버튼을 비활성화한다.
- 결과가 있고 저장 오류면 `지금 백업` action을 반환한다.
- 결과가 있고 백업 필요 상태면 `백업 만들기` action을 반환한다.

**Step 2: Verify RED**

Run: `npm test -- src/lib/workspace/mobile-sticky-action.test.ts`

Expected: FAIL because the module or function does not exist yet.

**Step 3: Implement minimal utility**

Return a small object containing:

- `statusLabel`
- `helperLabel`
- `buttonLabel`
- `action`
- `tone`
- `disabled`

Use field-friendly Korean copy and avoid technical storage terms.

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/workspace/mobile-sticky-action.test.ts`

Expected: PASS.

## Task 2: Mobile Sticky UI

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Step 1: Connect view model**

Import the utility and derive sticky action state from existing workspace lock, latest result, review CTA, save status, and export-needed state.

**Step 2: Render state and helper labels**

Keep `SaveStatusPill`, then render a compact status text group and one action button.

**Step 3: Preserve actions**

- `reloadLatestWorkspace` for latest action.
- `createPackingResult` for create action.
- `exportJson` for export action.
- disabled button when no safe action is available.

**Step 4: Style for field touch UX**

- Minimum action button height: 48px.
- No horizontal overflow at 360px.
- Text can wrap or truncate cleanly without covering controls.

## Task 3: Review And Verification

**Files:**
- Review modified files and generated diff.

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

**Browser checks:**
- 360px and 390px mobile: sticky action visible, no horizontal overflow.
- 768px tablet: main workflow remains usable without horizontal overflow.
- 1280px desktop: sticky action hidden, desktop workflow unaffected.

## Acceptance Criteria

- 모바일 하단에서 현재 상태와 다음 행동이 동시에 보인다.
- 저장 충돌/최신본 필요 상태에서는 다른 CTA보다 `최신본 불러오기`가 우선된다.
- 저장 실패 상태에서는 결과 유무와 관계없이 `지금 백업`이 우선된다.
- sticky 영역의 primary CTA는 항상 1개만 보여준다.
- `SaveStatusPill`은 상태 상세 확인용이며 primary CTA로 간주하지 않는다.
- 실행 불가 상태에서는 막힌 이유가 버튼 근처에 보이고 버튼이 비활성화된다.
- 360px 모바일에서 문구가 2줄 이상으로 감겨도 버튼이나 마지막 콘텐츠와 겹치지 않는다.
- 기존 결과 생성, 최신본 갱신, 백업 생성 동작이 유지된다.
- 전체 테스트, 타입체크, 빌드, 브라우저 점검을 통과한 뒤에만 커밋/푸시한다.
