# 2026-06-09 Chain Original Comparison Toggle

## Goal

추가 박스 시뮬레이션 미리보기 중 결과 뷰어에서 `원본`과 `추가 결과`를 전환할 수 있게 한다. 작업자는 추가 적재를 반영하기 전에 기존 배치와 달라진 배치를 같은 3D/2D/배치 상세 영역에서 비교해야 한다.

## Context

- V1 수용 기준은 결과 화면에 `원본 비교 토글`을 포함한다고 정의한다.
- 체이닝 미리보기는 이미 `chainPreview.spaces`를 통해 추가 결과를 보여준다.
- 기존 결과는 `latestResult.spaces`에 유지되므로 화면 모드만 전환하면 원본 비교를 제공할 수 있다.

## Options Reviewed

1. 체이닝 패널 안에만 토글 배치
   - 장점: 추가 적재 기능 가까이에 위치한다.
   - 단점: 실제로 바뀌는 3D/2D 뷰어와 거리가 있어 사용자가 어떤 화면이 바뀌는지 놓칠 수 있다.
2. 공간 목록에 토글을 섞기
   - 장점: 결과 탐색 영역 안에 들어간다.
   - 단점: Space 선택과 비교 모드가 섞여 현장 작업자에게 혼란을 줄 수 있다.
3. 결과 뷰어 툴바에 segmented control 배치
   - 장점: 지금 보고 있는 3D/2D 대상이 `원본`인지 `추가 결과`인지 바로 알 수 있다.
   - 단점: 툴바가 조금 길어지므로 모바일 줄바꿈과 터치 타깃을 고정해야 한다.

## Decision

3번을 선택한다. W3C APG Button Pattern의 toggle button 상태 표현을 참고해 `button`과 `aria-pressed`를 사용하고, WCAG 2.2 Target Size 기준보다 큰 48px 터치 타깃을 적용한다.

## Implementation Notes

- `resolveChainComparisonSpaces` 헬퍼를 추가해 원본/추가 결과 모드별 표시 공간을 결정한다.
- 체이닝 미리보기 성공 시 기본값은 `추가 결과`로 둔다.
- `원본` 모드에서는 새로 추가될 박스 강조 ID를 비워 기존 결과만 표시한다.
- 토글은 체이닝 미리보기에서 추가 가능 수량이 1개 이상일 때만 표시한다.
- 모바일에서는 토글 버튼을 한 컬럼으로 내려 가로 넘침을 막는다.

## Role Review

- product-manager: 수용 기준의 `원본 비교 토글`을 기존 체이닝 구조 위에 작은 범위로 추가한다.
- business-analyst: 현장 작업자는 추가 적재 확정 전 기존 배치가 어떻게 달라지는지 확인해야 하므로 비교 모드가 필요하다.
- ui-designer: 결과 뷰어 툴바 안에 두어 현재 보이는 시각화 대상과 컨트롤의 관계를 가깝게 유지한다.
- ui-ux-tester: 360px, 390px, 768px, 1280px에서 토글이 잘리지 않고, `원본` 전환 시 새 박스 강조가 사라져야 한다.
- code-reviewer: 표시 공간 선택은 순수 헬퍼로 분리하고, UI는 정적 테스트로 토글 누락을 막는다.

## References

- W3C ARIA Authoring Practices Guide, Button Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/button/
- W3C WCAG 2.2, Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
