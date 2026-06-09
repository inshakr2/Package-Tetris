# Package Tetris V1 Result 3D Keyboard Accessibility

**Goal:** PC 시연과 보조기기 사용 상황에서 3D 결과 뷰어가 키보드로 안정적으로 조작되도록 한다.

**Context:** 현재 3D 캔버스는 포커스와 키 입력을 받지만 키 매핑, 안내 문구, ESC 처리, 줌 기준점이 컴포넌트 내부에 흩어져 있다. 현장 작업자는 주로 터치로 쓰겠지만, 시연 PC와 접근성 검증에서는 키보드 계약이 명확해야 한다.

## Approaches

1. OrbitControls 기본 조작만 유지한다.
   - 장점: 변경 범위가 작다.
   - 단점: 키 매핑과 안내 문구가 테스트되지 않고, 확대 3D dialog에서 ESC 동작이 예측하기 어렵다.

2. 키 입력 해석을 순수 유틸로 분리하고 3D 컴포넌트가 이를 실행한다.
   - 장점: 키 매핑을 Node test로 고정하고, UI는 안내와 실행만 담당한다.
   - 단점: 유틸과 컴포넌트 연결 테스트가 추가된다.

3. 3D 뷰어 컨트롤을 별도 명령 패널로 재구성한다.
   - 장점: 모든 조작을 버튼 중심으로 만들 수 있다.
   - 단점: V1 마무리 범위를 넘고 기존 모바일 결과 화면의 검증 범위가 커진다.

**Decision:** 2번을 적용한다. V1에서는 화면 구조를 흔들지 않고, 키보드 계약과 안내만 명확히 하는 것이 가장 안전하다.

## Role Review

- **product-manager:** 서버/저장 구조 변경 없이 시연 안정성을 높이는 증분이다. 공중 블록 같은 최적화 정합성 이슈와 분리한다.
- **business-analyst:** IT 지식이 없는 현장 작업자에게는 키보드 단축키보다 명시적 버튼이 중요하다. 따라서 기존 버튼은 유지하고 키보드는 보조 접근 경로로 둔다.
- **ui-designer:** 3D 화면 안에 긴 설명을 크게 노출하지 않는다. 스크린리더에는 `aria-describedby`로 전체 안내를 제공한다.
- **ui-ux-tester:** 360px/390px에서 안내 문구가 가로 넘침을 만들지 않고, 확대 3D dialog에서 ESC가 선택 해제로 동작하는지 확인한다.
- **nextjs-developer:** Three.js client-only 구조와 static export를 유지한다. 카메라 줌은 `controls.target` 기준으로 계산해 시점이 엇나가지 않게 한다.

## Acceptance Criteria

- 3D host는 포커스 가능한 조작 영역이며 키보드 안내와 연결된다.
- 화살표 키는 대상 중심으로 카메라를 회전한다.
- `+`, `=`, `-`는 대상 중심으로 줌 인/아웃한다.
- `1`, `2`, `3`, `4`는 사시/위/앞/옆 시점으로 이동한다.
- `0`은 현재 선택된 기본 카메라 프리셋으로 되돌린다.
- `Esc`는 선택 강조를 해제하고 기본 dialog 닫힘과 충돌하지 않도록 기본 동작을 막는다.
- 모든 키 매핑은 순수 유틸 테스트로 검증한다.
- 기존 3D ready 상태와 모바일 overflow 검증은 유지한다.

## References

- W3C WAI-ARIA Overview: custom controls should expose roles, states, relationships, and keyboard navigation to assistive technology.
- W3C ARIA Authoring Practices Guide: accessible widgets need semantics, names/descriptions, and keyboard support.
- MDN ARIA application role: `application` 역할은 매우 동적인 데스크톱형 영역에 신중히 써야 하므로, 이번 증분은 이름 있는 `region`과 `aria-describedby` 안내를 사용한다.
