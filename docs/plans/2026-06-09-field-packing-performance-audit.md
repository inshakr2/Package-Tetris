# 현장형 대량 입력 성능 audit

## PM 판단

V1 시연 전 남은 리스크는 `안전한 결과가 나오는가`뿐 아니라 `현장형 대량 입력에서 사용자가 기다릴 수 있는 시간 안에 계산되는가`다. Web Worker가 UI 멈춤을 줄이더라도, 계산 시간이 과도하면 현장 작업자는 중복 클릭하거나 앱 오류로 오해할 수 있다.

이번 증분은 엔진을 바꾸지 않고, 기존 현장형 preset 시나리오에 계산 시간 측정과 예산 초과 판정을 추가한다.

## 검토한 접근

1. 수동 스톱워치 측정
   - 장점: 실제 체감에 가깝다.
   - 단점: 반복 검증과 회귀 감지가 어렵다.
2. 절대 시간 기반 엄격 성능 테스트
   - 장점: 느려지는 회귀를 즉시 잡는다.
   - 단점: PC 성능 차이로 테스트가 불안정해질 수 있다.
3. 구조화된 성능 audit + 넉넉한 V1 시연 예산
   - 장점: 자동 기록과 회귀 감지를 제공하면서 flake 위험을 낮춘다.
   - 단점: 정밀 benchmark는 아니므로 운영 전 실제 PC 측정이 필요하다.

채택: 3번.

## 적용 내용

- `runFieldPackingScenarioPerformanceAudit`를 추가한다.
- 각 시나리오별로 계산 시간, 적재 박스 수, 사용 공간 수, 미적재 수, 안전 검증 여부, 예산 통과 여부를 반환한다.
- fake clock 테스트로 예산 초과 판정을 안정적으로 고정한다.
- 실제 엔진 테스트는 3개 현장형 시나리오가 V1 시연 예산 `5000ms/시나리오` 안에서 계산되는지 확인한다.

## 역할별 검토

- product-manager: V1 시연 전 성능 리스크를 수치로 관리한다.
- business-analyst: 현장 PC 성능 차이가 있으므로 자동 audit은 기준 신호이고, 실제 현장 PC 리허설은 별도로 유지한다.
- ui-designer: UI 변경 없이 성능 근거만 보강한다.
- ui-ux-tester: 계산 지연 시나리오를 `slowScenarioNames`로 추적해 수동 시연 전 확인할 수 있다.
- code-reviewer: 절대 시간 테스트 flake를 줄이기 위해 fake clock 테스트와 넉넉한 실제 예산을 함께 둔다.
- nextjs-developer: 프론트 단독 구조와 기존 엔진 인터페이스를 유지한다.

## 현재 측정 결과

- 측정 환경: 로컬 개발 환경, Node test runner
- 시나리오 수: 3
- 총 적재 박스 수: 90
- 총 사용 공간 수: 5
- 총 계산 시간: 310ms
- 예산 초과 시나리오: 0
- 안전 실패 시나리오: 0

## 수용 기준

- 시나리오별 elapsed, packed count, used space count, unloaded count, safety, budget 판정을 반환한다.
- fake clock 테스트로 budget 초과 시나리오가 `slowScenarioNames`에 기록된다.
- 실제 현장형 preset 3개 시나리오는 V1 시연 예산 안에서 계산된다.
- `npm test`, `npx tsc --noEmit`, `npm run build`, 브라우저 검증이 통과한다.
