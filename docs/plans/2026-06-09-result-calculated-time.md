# Result Calculated Time Implementation Plan

## Context

결과 화면은 사용 공간, 적재율, 미적재 수를 크게 보여주지만, 현장 작업자가 지금 보고 있는 결과가 언제 계산된 것인지 바로 알기 어렵다. 여러 번 결과를 만들고 백업/체이닝을 반복하는 사용 흐름에서는 계산 시각이 결과 신뢰 확인에 도움이 된다.

## 3 Approaches

1. **KPI 타일 하나를 `계산 시각`으로 교체**
   - 장점: 매우 잘 보인다.
   - 단점: 기존 핵심 KPI 4개 중 하나를 잃는다.

2. **결과 헤더 보조 줄에 `계산 시각` 표시**
   - 장점: 기존 KPI를 유지하면서 결과 최신성을 바로 알 수 있다.
   - 단점: 헤더 문구가 조금 길어진다.

3. **별도 결과 정보 패널 추가**
   - 장점: 실행 시간, 결과 ID 등 확장 여지가 크다.
   - 단점: 이번 V1 현장 UI에는 과하고 결과 영역이 길어진다.

## Decision

2번을 적용한다. `latestResult.createdAt`을 기존 `formatDateTime`으로 변환해 결과 헤더 안에 `계산 시각` 메타로 표시한다. 결과가 없을 때는 `결과를 만들면 계산 시각이 표시됩니다.`로 안내한다. 저장 스키마와 import/export 포맷은 변경하지 않는다.

## Role Review

- product-manager: 결과 재계산/백업/체이닝 흐름에서 최신 결과 식별성을 높인다.
- business-analyst: 현장 작업자가 “이 결과가 방금 만든 결과인지” 확인할 수 있다.
- ui-designer: KPI 타일은 유지하고, 보조 메타 칩으로 작게 표시해 결과 영역 밀도를 크게 늘리지 않는다.
- ui-ux-tester: 모바일 360px에서 헤더 메타가 줄바꿈되며 가로 넘침 없이 읽혀야 한다.
- nextjs-developer: 기존 `createdAt`과 `formatDateTime`만 사용한다.

## Test Plan

1. 결과 화면 헤더가 `latestResult.createdAt`을 `formatDateTime`으로 표시한다.
2. 결과가 없을 때 계산 시각 대기 문구를 표시한다.
3. CSS는 모바일에서 메타 칩이 줄바꿈되고 텍스트가 넘치지 않도록 한다.
4. `npm test`, `npx tsc --noEmit`, `npm run build`, Browser 360/390/768/1280 검증을 수행한다.
