# Field Operator UX Design

**Goal:** IT 도메인 지식이 없는 현장 작업자가 모바일/태블릿에서 다음 행동을 쉽게 이해하고, 터치 실수 없이 적재 계산과 백업까지 완료할 수 있게 한다.

**Decision:** 기존 4개 세로 섹션을 유지하고, 현장 언어, 큰 터치 타깃, 다음 행동 CTA, 저장/충돌 문구를 보강한다. 모바일 3D 전체화면은 후속 작업으로 둔다.

## Compared Approaches

1. 전체 IA 재설계
   - 효과는 크지만 기존 4개 세로 섹션과 3D 결과 뷰를 크게 흔든다.
2. 현장 모드 별도 추가
   - 모바일/태블릿 전용 경험을 만들 수 있지만 V1 범위와 중복 화면이 늘어난다.
3. 기존 화면 위에 현장 작업자 UX 보강
   - 기존 구현을 살리면서 즉시 사용성을 높일 수 있다.

채택: 3번.

## Product Manager Scope

- 상단 기술 문구를 현장 언어로 바꾼다.
- `JSON 내보내기`는 주 버튼에서 `백업 파일 만들기`로 표현하고, 파일 형식은 보조 설명으로 둔다.
- 섹션 제목을 작업 동사 중심으로 직접화한다.
- 실행 전 확인과 결과 대기 상태에서 다음 행동을 더 크게 보여준다.
- 모바일 하단 sticky action은 결과 생성 가능 상태에서 `결과 만들기`를 우선 노출한다.
- 주요 버튼과 입력은 현장 터치를 고려해 최소 44~48px 높이로 보강한다.

## Accessibility Sources

- W3C WCAG 2.2 Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C WCAG 2.2 Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Apple UI Design Tips: https://developer.apple.com/design/tips/
- Android Views Accessibility: https://developer.android.com/guide/topics/ui/accessibility/views/apps-views

## Acceptance Criteria

- 모바일 360px/390px에서 horizontal overflow가 없다.
- 주요 버튼과 입력은 44px 이상, 모바일 주요 조작은 48px 이상 높이를 가진다.
- 결과가 없고 실행 준비가 끝난 경우 결과 영역에서도 `결과 만들기` CTA를 볼 수 있다.
- 저장/백업/충돌 문구는 기술 용어보다 행동 중심으로 표시된다.
- 3D 결과 뷰와 2D 전환 기능은 기존처럼 동작한다.
