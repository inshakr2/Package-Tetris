# Unloaded Result Callout Implementation Plan

## Context

결과 요약에는 `미적재 N개`가 표시되지만, 어떤 문제가 생겼고 다음에 무엇을 해야 하는지는 하단의 경고 목록까지 내려가야 알 수 있다. 현장 작업자는 결과를 본 직후 미적재가 있으면 박스 수량을 줄일지, 더 큰 공간을 선택할지 빠르게 판단해야 한다.

## 3 Approaches

1. **현재 하단 warning 목록만 유지**
   - 장점: 추가 UI가 없다.
   - 단점: 메인 결과 영역에서 위험 신호가 약하고 모바일에서 놓치기 쉽다.

2. **결과 요약 바로 아래 미적재 callout 추가**
   - 장점: 미적재가 발생한 순간 가장 눈에 잘 띄며, 다음 행동을 짧게 안내할 수 있다.
   - 단점: 결과 상단 정보가 조금 늘어난다.

3. **미적재를 별도 Space처럼 목록에 추가**
   - 장점: 공간 탐색 흐름과 통합된다.
   - 단점: 실제 적재 공간이 아닌 항목이 공간 목록에 섞여 혼란을 줄 수 있다.

## Decision

2번을 적용한다. `latestResult.unloadedBlockCount > 0`일 때 결과 KPI 아래에 `미적재 확인` callout을 보여준다. 엔진의 warning 문자열은 중복될 수 있으므로 유틸에서 같은 문구를 압축해 최대 2개만 보여주고, 나머지는 `외 N건`으로 요약한다.

## Role Review

- product-manager: 결과 화면의 핵심 리스크를 상단에서 즉시 확인하게 해 결과 해석 시간을 줄인다.
- business-analyst: 현장 작업자는 `미적재` 숫자보다 "수량을 줄이거나 더 큰 공간 선택" 같은 다음 행동이 필요하다.
- ui-designer: 새 callout은 결과 KPI 아래에만 표시하고, 48px 터치 CTA 없이 정보형 상태로 유지해 화면 복잡도를 낮춘다.
- ui-ux-tester: 360px/390px에서 경고 문구가 넘치지 않고 결과/3D 영역을 밀어도 오버플로우가 없어야 한다.
- nextjs-developer: 저장 스키마와 엔진 출력은 변경하지 않고, 기존 `warnings`를 표시용으로만 압축한다.

## Test Plan

1. `createResultWarningSummary`가 중복 경고를 `문구 · N건`으로 압축한다.
2. 빈 경고는 빈 배열을 반환한다.
3. 결과 화면은 `unloadedBlockCount > 0`일 때 `result-unloaded-callout`과 `미적재 확인` 문구를 포함한다.
4. CSS는 모바일에서 한 컬럼으로 줄바꿈하고 텍스트가 박스를 넘지 않도록 한다.
5. `npm test`, `npx tsc --noEmit`, `npm run build`, Browser 360/390/768/1280 검증을 수행한다.
