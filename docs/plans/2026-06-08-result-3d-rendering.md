# Result 3D Rendering Implementation Plan

**Goal:** 결과 화면에서 v0 엔진의 `PackedBlock` 좌표를 실제 3D 적재 장면으로 보여주고, 기존 2D 투영은 같은 뷰어의 보조 검토 모드로 유지한다.

**Architecture:** `ResultStage`는 보기 모드, 공간 인스턴스, 블록 유형 선택 상태만 관리한다. 3D 렌더링은 lazy-loaded client component가 담당한다. 좌표 변환과 색상 결정은 순수 유틸로 분리해 Node test로 검증한다.

**Tech Stack:** Next.js App Router static export, React client component, TypeScript, Three.js WebGLRenderer, OrbitControls, Node test runner.

---

## Product Manager Decision

검토한 3가지 방법:

1. CSS 3D 또는 Canvas 2D 기반 유사 3D
   - 장점: 의존성이 적고 구현이 빠르다.
   - 단점: 자유 카메라, 깊이 표현, 블록 선택, 향후 3D 확장성이 약하다.
2. React Three Fiber
   - 장점: React 선언형 구조와 궁합이 좋고 장기 확장성이 좋다.
   - 단점: 첫 3D 도입 범위에 비해 런타임 추상화와 학습 비용이 크다.
3. plain Three.js + 순수 scene adapter
   - 장점: 요구사항의 직육면체 3D 렌더링을 직접 구현할 수 있고, 좌표 변환은 테스트 가능한 순수 유틸로 분리된다.
   - 단점: renderer lifecycle과 dispose를 직접 관리해야 한다.

채택: 3번. 이번 증분은 3D 뷰어 1차 도입이므로 plain Three.js가 가장 작은 안전한 변경이다. React Three Fiber는 수동 배치 편집, 복잡한 애니메이션, 다중 scene 확장이 확정될 때 재검토한다.

공식 근거:

- Three.js `BoxGeometry`는 width, height, depth를 가진 rectangular cuboid를 표현한다: https://threejs.org/docs/pages/BoxGeometry.html
- Three.js `WebGLRenderer`는 WebGL로 scene을 canvas에 렌더링하며, 사용이 끝나면 `dispose()`를 호출해야 한다: https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js responsive guide는 renderer size를 canvas 표시 크기에 맞추는 방식을 권장한다: https://threejs.org/manual/en/responsive.html
- MDN `requestAnimationFrame()`은 브라우저 repaint 전 애니메이션 callback을 실행하는 API다: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN WebGL best practices는 고해상도/리소스/컨텍스트 관리 고려가 필요하다고 설명한다: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

## Agent Review Summary

- business-analyst: `V1은 실제 3D 결과 검토까지 포함`, `선택 단위는 블록 유형`, `추가 블록 시뮬레이션 고도화는 별도 증분`으로 정리했다.
- ui-designer: 기존 중앙 projection slot을 `배치 뷰어`로 확장하고, 3D/2D 전환을 같은 슬롯에 두는 방식을 권고했다.
- nextjs-developer: `plain three + lazy-loaded client canvas + pure scene adapter`를 권고했고, 3D 도입 전 `packing-scene` 테스트 baseline과 의존성 pinning을 선행 조건으로 제안했다.

## Implementation Scope

- `src/lib/workspace/block-colors.ts`
  - 2D/3D 공통 블록 유형 색상 팔레트를 제공한다.
- `src/lib/workspace/packing-scene.ts`
  - usable bounds를 scene units로 정규화한다.
  - `PackedBlock` 좌표를 Three.js y-up 중심 좌표로 변환한다.
- `src/components/result-stage/result-3d-canvas.client.tsx`
  - WebGLRenderer, OrbitControls, scene/camera/light/frame/grid/block mesh를 생성한다.
  - 공간 변경, 범례 선택, chain preview 상태를 반영한다.
  - canvas click으로 블록 유형 선택을 동기화한다.
  - renderer, geometry, material, animation frame을 cleanup한다.
- `src/components/tetris-workspace-app.tsx`
  - 결과 보기 모드를 `three | top | front | side`로 확장한다.
  - 3D mode를 기본값으로 하고 기존 2D projection은 보조 mode로 유지한다.
- `src/app/globals.css`
  - 3D host, tooltip, camera controls, mobile sizing을 추가한다.

## Acceptance Criteria

- 결과가 있으면 중앙 배치 뷰어의 기본 모드는 3D다.
- 사용자는 `3D`, `상면`, `정면`, `측면`, `리셋`으로 결과 보기 모드를 바꿀 수 있다.
- 3D 모드에서 `자유시점`, `상면`, `정면`, `측면` 카메라 프리셋을 쓸 수 있다.
- 공간 인스턴스를 바꾸면 3D scene도 해당 공간으로 전환된다.
- 범례 선택과 3D 블록 클릭은 같은 블록 유형 강조 상태를 공유한다.
- 선택되지 않은 블록도 윤곽선은 유지하고 반투명 처리된다.
- 추가 블록 preview 신규 블록은 3D에서도 기존 블록과 구분된다.
- WebGL 초기화 실패 상태에서는 안내 문구가 나오고 2D 보조 뷰는 계속 사용할 수 있다.
- 390px와 1280px에서 3D 뷰어와 컨트롤이 horizontal overflow를 만들지 않는다.

## Out Of Scope

- 모바일 전체화면 3D sheet.
- 치수 오버레이, 좌표 상세 테이블, 절단면, 폭발도.
- 개별 블록 인스턴스 단위 선택 모델.
- 3D 장면 안에서 수동 배치 수정 또는 drag editing.
- React Three Fiber 전환.

## Optimization Consistency Follow-Up

사용자 검토 피드백: 실제 화물은 바닥 또는 다른 화물 위에 쌓이는 구조이므로, 적재 결과에 공중에 떠 있는 블록이 나오면 안 된다.

현재 3D 렌더러는 엔진이 반환한 `PackedBlock.xMm/yMm/zMm` 좌표를 그대로 보여주는 검토 뷰어다. 따라서 공중 블록 방지는 렌더러 보정이 아니라 적재 엔진 정합성 요구사항으로 다룬다.

다음 최적화 작업에서 반영할 기준:

- 모든 블록은 `zMm === 0`이거나, 하부 블록의 상단면과 맞닿아야 한다.
- 하부 지지면의 2D 교차 면적이 후보 블록 바닥 면적을 충분히 지지해야 한다.
- 3D 충돌, 공간 경계 초과, fragile 적층 정책 위반을 자동 테스트로 검증한다.
- 기존 `chain-simulation.ts`의 `hasStableSupport` 계열 규칙을 `packing-engine` 본류에도 적용할 수 있는지 검토한다.
