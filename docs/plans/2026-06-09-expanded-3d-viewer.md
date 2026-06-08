# Expanded 3D Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모바일과 태블릿 현장 작업자가 결과 3D 뷰를 더 크게 열어 적재 위치를 확인할 수 있게 한다.

**Architecture:** 기존 인라인 3D 뷰어는 유지한다. `크게 보기` 버튼은 native `<dialog>`를 열고, 같은 결과 공간, 카메라 프리셋, 박스 강조 상태를 전달한 별도 `Result3DCanvas`를 표시한다. 닫기 후에는 버튼 포커스를 복원한다.

**Tech Stack:** Next.js App Router static export, React client component, native HTML dialog, Three.js client-only canvas, Node test runner.

---

## Compared Approaches

1. CSS만으로 인라인 3D 영역 높이 확대
   - 구현은 작지만 결과 섹션 전체가 길어져 공간 목록과 범례 접근성이 떨어진다.
2. 새 라우트 또는 별도 페이지
   - 큰 화면은 만들기 쉽지만 현재 결과 상태를 전달하는 흐름이 V1 프론트 단독 범위에서 복잡하다.
3. native dialog 기반 `크게 보기`
   - 현재 결과 상태를 유지하면서 top layer에 큰 뷰어를 제공한다. 기존 공간/삭제 모달 패턴도 재사용할 수 있다.

채택: 3번. MDN의 `HTMLDialogElement.showModal()` 문서에 따르면 modal dialog는 top layer에 표시되며, hidden 상태에서는 accessibility tree에서도 빠진다. 기존 프로젝트의 dialog 패턴과 일치한다.

## Task 1: Layout Guard Tests

**Files:**
- Create: `src/lib/workspace/result-viewer-expanded-layout.test.ts`
- Modify: `src/app/globals.css`

**Steps:**
1. expanded 3D button과 dialog CSS를 요구하는 실패 테스트를 작성한다.
2. `node --import tsx --test src/lib/workspace/result-viewer-expanded-layout.test.ts`로 RED를 확인한다.
3. dialog, sheet, body, mobile full-height CSS를 추가한다.
4. 같은 테스트로 GREEN을 확인한다.

## Task 2: Component Markup

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`

**Steps:**
1. ResultStage에 `threeDialogOpen` 상태와 trigger ref를 추가한다.
2. 3D 모드에서 `크게 보기` 버튼을 추가한다.
3. `ExpandedThreeViewDialog`를 추가해 native dialog와 `Result3DCanvas`를 렌더링한다.
4. 닫기, Esc, 포커스 복원을 기존 dialog 패턴과 맞춘다.

## Task 3: Verification

**Commands:**
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Browser: 360px, 390px, 768px, 1280px에서 horizontal overflow와 3D ready 상태 확인

## Sources

- MDN HTMLDialogElement showModal: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
- MDN dialog element: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- W3C WCAG 2.2 Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
