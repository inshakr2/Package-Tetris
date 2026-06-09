# 2026-06-09 Placement Detail Table

## Goal

결과 화면에 선택 공간 기준의 `배치 상세` 표를 추가한다. 현장 작업자가 3D/2D 뷰를 보지 못하는 상황에서도 박스별 위치, 회전 후 크기, 깨짐주의 여부를 확인할 수 있어야 한다.

## Context

- V1 수용 기준은 결과 화면에 `배치 상세`, `입력 수정`, `다시 계산`, 추가 결과 미리보기 비교 버튼을 포함한다고 정의한다.
- 직전 증분에서 `입력 수정`과 `다시 계산` 액션은 보강됐다.
- 이번 증분은 남은 `배치 테이블` 요구를 닫되, 현장 모바일 화면에서 좌우 스크롤이 생기지 않는 형태를 우선한다.

## Options Reviewed

1. 네이티브 `<table>`
   - 장점: 표 의미가 명확하고 구현이 단순하다.
   - 단점: 박스명, 위치, 크기 컬럼이 길어지면 모바일에서 좌우 스크롤이 생기기 쉽다.
2. 단순 세로 리스트
   - 장점: 모바일 가독성이 좋고 화면 폭에 강하다.
   - 단점: 순서, 위치, 크기 같은 열 구조가 약해져 결과 검토용 표라는 인지가 떨어진다.
3. `role="table"` 기반 카드형 표
   - 장점: 데스크톱에서는 표처럼 읽히고 모바일에서는 카드형 행으로 리플로우할 수 있다.
   - 단점: 네이티브 표보다 접근성 속성을 명시적으로 관리해야 한다.

## Decision

3번을 선택한다. W3C APG의 정적 table semantics를 참고해 `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`을 사용하고, WCAG Reflow 관점에서 모바일에서는 한 컬럼 카드형 행으로 전환한다.

## Implementation Notes

- `createPlacementDetailRows` 헬퍼를 추가해 선택 공간의 `PackedBlock`을 바닥 높이, 앞쪽 좌표, 왼쪽 좌표 순으로 정렬한다.
- 행에는 순서, 박스명, 취급 라벨, 위치, 회전 후 크기, 방향 라벨을 제공한다.
- 결과 화면 하단 `결과 작업` 아래에 `배치 상세`를 배치해 3D/2D 뷰 다음으로 바로 확인할 수 있게 한다.
- CSS는 `min-width: 0`, `overflow-wrap: anywhere`, 모바일 한 컬럼 전환을 고정해 긴 박스명에서도 상위 레이아웃을 밀지 않게 한다.

## Role Review

- product-manager: V1 결과 화면 수용 기준의 `배치 테이블` 공백을 작은 증분으로 닫는다.
- business-analyst: 실제 작업자는 3D 조작보다 좌표와 크기 텍스트를 빠르게 확인해야 하므로, 배치 상세는 결과 화면의 보조 필수 정보다.
- ui-designer: 전체 결과 영역을 흐트러뜨리지 않도록 하단 풀폭 패널로 배치하고, 모바일에서는 표 헤더를 숨긴 뒤 각 셀에 라벨을 붙인다.
- ui-ux-tester: 360px, 390px, 768px, 1280px에서 좌우 오버플로우가 없어야 하며, `배치 상세`과 첫 번째 행이 읽혀야 한다.
- code-reviewer: 순수 정렬/라벨 헬퍼는 단위 테스트로 고정하고, UI는 정적 레이아웃 테스트로 회귀를 막는다.

## References

- W3C ARIA Authoring Practices Guide, Table Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/table/
- W3C WCAG 2.2, Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
