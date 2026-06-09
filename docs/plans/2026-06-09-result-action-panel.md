# Package Tetris V1 Result Action Panel

## Goal

결과 화면을 확인한 현장 작업자가 입력을 다시 고치거나 같은 조건으로 다시 계산할 때 3번 영역을 직접 찾아 스크롤하지 않아도 되게 한다.

## Context

V1 기획서는 결과 화면에 `입력 수정`과 `다시 계산` 경로가 있어야 한다고 정의한다. 현재 화면은 입력 섹션과 결과 섹션이 한 페이지에 모두 있지만, 결과를 본 뒤 입력으로 돌아가는 행동이 명시적이지 않아 현장 작업자가 “어디서 다시 고치지?”라고 느낄 수 있다.

## Compared Approaches

1. 결과 영역에 액션 패널을 추가한다.
   - 장점: 결과를 본 자리에서 다음 행동이 바로 보인다.
   - 장점: 기존 결과 생성 로직과 한 페이지 구조를 그대로 재사용한다.
   - 단점: 결과 하단 보조 패널이 하나 늘어난다.

2. 결과 freshness banner가 뜰 때만 다시 계산 버튼을 보여준다.
   - 장점: UI 밀도가 낮다.
   - 단점: 결과가 최신이어도 현장 작업자가 수동 재계산을 원할 수 있다.

3. 새 편집 모달을 연다.
   - 장점: 현재 위치를 유지한 채 입력을 고칠 수 있다.
   - 단점: 기존 3번 영역과 입력 상태가 중복되어 V1 범위와 회귀 위험이 커진다.

## Decision

1번을 적용한다. 결과 하단에 `결과 작업` 패널을 추가하고, `입력 수정`은 현재 작업 섹션으로 `scrollIntoView` 후 포커스를 이동한다. `다시 계산`은 기존 `onCreateResult`를 재사용하며, 실행 전 검토가 막힌 상태에서는 같은 disabled reason을 보여준다.

## Role Review

- product-manager: V1 수용 기준 중 결과 화면 CTA 누락을 작은 범위로 보강한다.
- business-analyst: IT 비숙련 현장 작업자는 화면 안에서 다음 행동이 보여야 하므로 결과 근처에 입력 수정 경로가 필요하다.
- ui-designer: 새 모달을 만들지 않고 기존 세로 흐름을 유지한다. 버튼은 48px 높이를 유지하고 모바일에서는 한 컬럼으로 쌓는다.
- ui-ux-tester: 360px, 390px에서 두 액션이 줄바꿈되어도 가로 overflow가 없어야 한다. 입력 수정 후 sticky header에 섹션 제목이 가려지지 않아야 한다.
- nextjs-developer: 저장 스키마와 엔진은 변경하지 않고 `ResultStage` prop, ref 기반 스크롤, CSS만 추가한다.

## External References

- MDN Element.scrollIntoView: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- W3C WCAG 2.2 Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

## Acceptance Criteria

- 결과 화면 하단에 `결과 작업`, `입력 수정`, `다시 계산`이 보인다.
- `입력 수정`은 3번 영역으로 이동하고 해당 섹션에 포커스를 둔다.
- `다시 계산`은 기존 결과 생성 로직을 재사용한다.
- 실행 전 검토가 막힌 경우 `다시 계산`도 비활성화되고 막힌 이유를 유지한다.
- 모바일에서 액션 버튼은 한 컬럼으로 내려가며 48px 이상 터치 타깃을 유지한다.
