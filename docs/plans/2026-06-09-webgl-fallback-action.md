# WebGL Fallback Action Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 3D 렌더링이 실패해도 현장 작업자가 즉시 2D 위 보기로 결과 검토를 계속할 수 있게 한다.

**Architecture:** `Result3DCanvas`는 WebGL 오류 상태에서 fallback action을 표시할 수 있는 optional prop을 받는다. 인라인 3D 뷰어의 fallback은 `위 보기`로 전환하고, 확대 3D dialog의 fallback은 dialog를 닫은 뒤 같은 `위 보기`로 전환한다. 정상 3D 렌더링, 공간 선택, 박스 강조 상태는 변경하지 않는다.

**Tech Stack:** Next.js App Router static export, React client component, TypeScript, Three.js, Node test runner.

---

## Compared Approaches

1. 오류 문구만 유지
   - 구현은 없지만 V1 기획서의 `WebGL 실패 시 2D 보조 뷰로 계속 확인` 요구를 사용자가 직접 추론해야 한다.
2. 3D error 상태에서 자동으로 2D로 전환
   - 빠르지만 사용자가 왜 화면이 바뀌었는지 알기 어렵고, 일시적 WebGL 초기화 지연과 오류를 구분하기 어렵다.
3. 명시적 `위 보기로 확인` CTA
   - 오류 원인과 다음 행동을 함께 제공한다. 현장 사용자가 실패 화면에 멈추지 않고 2D fallback으로 직접 이동할 수 있다.

채택: 3번.

## Role Review

- business-analyst: 결과 확인은 3D 기본 뷰와 2D 보조 뷰 fallback이 함께 살아 있어야 한다. 오류는 코드보다 행동으로 안내한다.
- ui-designer: 빨간 경고만 키우지 말고 `3D 표시 불가 -> 위 보기로 확인`처럼 상태와 행동을 함께 보여준다. CTA는 48px 터치 타깃을 유지한다.
- nextjs-developer: renderer lifecycle은 그대로 두고 optional prop으로만 확장한다. 3D 실패 강제 브라우저 테스트는 어렵기 때문에 구조 테스트와 정상 3D 브라우저 회귀 검증을 병행한다.

## Task 1: RED Test

**Files:**
- Create: `src/lib/workspace/webgl-fallback-action-layout.test.ts`

**Steps:**
1. `Result3DCanvas`가 `fallbackAction` prop과 `three-fallback-action` 버튼을 포함해야 한다는 테스트를 작성한다.
2. `tetris-workspace-app.tsx`가 인라인/확대 3D에 fallback action을 전달해야 한다는 테스트를 작성한다.
3. CSS에서 48px touch target과 모바일 줄바꿈을 요구한다.
4. `node --import tsx --test src/lib/workspace/webgl-fallback-action-layout.test.ts`로 실패를 확인한다.

## Task 2: GREEN Implementation

**Files:**
- Modify: `src/components/result-stage/result-3d-canvas.client.tsx`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Steps:**
1. `Result3DCanvasProps`에 optional `fallbackAction`을 추가한다.
2. render error 상태의 status row에 `위 보기로 확인` CTA를 표시한다.
3. 인라인 3D fallback은 `selectProjectionView("top")`을 호출한다.
4. 확대 dialog fallback은 dialog를 닫고 `selectProjectionView("top")`을 호출한다.
5. 모바일에서 fallback CTA가 가로 overflow를 만들지 않도록 CSS를 추가한다.

## Task 3: Verification

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- Browser 360px, 390px, 768px, 1280px: 정상 3D ready, 확대 3D ready, horizontal overflow 없음

## Sources

- MDN WebGL best practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- MDN Detect WebGL: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
- Three.js WebGLRenderer docs: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
