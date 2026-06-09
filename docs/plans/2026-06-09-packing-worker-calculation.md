# Web Worker 기반 적재 계산

## PM 판단

현장 작업자는 `결과 만들기`를 누른 뒤 화면이 멈춘 것처럼 보이면 중복 클릭하거나 앱 오류로 오해할 수 있다. V1은 서버와 작업 큐를 도입하지 않으므로, 브라우저 안에서 적재 계산만 Web Worker로 분리해 UI 스레드 부담을 줄인다.

계산 엔진, 안전 게이트, 저장 스키마는 변경하지 않는다. Worker가 지원되지 않거나 회사 보안 정책으로 막히는 환경에서는 기존 메인 스레드 계산으로 fallback한다.

## 검토한 접근

1. 현재 `setTimeout` 단계 표시 유지
   - 장점: 구현 위험이 낮다.
   - 단점: 계산 자체는 여전히 UI 스레드에서 실행되어 대량 입력 시 화면이 멈출 수 있다.
2. 서버 작업 큐 도입
   - 장점: 장기 계산과 여러 기기 동기화에 유리하다.
   - 단점: V1 프론트 단독 범위를 넘고 인증/DB/운영 비용이 생긴다.
3. Web Worker 계산 분리
   - 장점: V1 프론트 단독을 유지하면서 계산 중 UI 반응성을 개선한다.
   - 단점: Worker 번들링과 미지원 환경 fallback 검증이 필요하다.

채택: 3번.

## 적용 내용

- `packing-worker.ts`가 `runPackingEngineV0`을 Worker thread에서 실행한다.
- `packing-worker-client.ts`가 요청 ID, 성공/실패 응답, timeout, `worker.terminate()` 정리를 담당한다.
- Worker 생성 실패 시 기존 `runPackingEngineV0`으로 fallback한다.
- 결과 생성 화면은 직접 엔진 호출 대신 `await runPackingEngineInWorker(optimizationInput)`을 사용한다.
- 적재 계산 중 안내 문구에 `계산 중에도 화면은 유지됩니다.`를 추가한다.

## 역할별 검토

- product-manager: 서버 없는 V1을 유지하면서 현장 시연 중 앱 멈춤 오해를 줄이는 증분이다.
- business-analyst: 사용자는 기술어보다 “계산 중 화면이 유지된다”는 행동 정보를 필요로 한다.
- ui-designer: 새 UI 컴포넌트를 늘리지 않고 기존 진행 상태 문구만 보강한다.
- ui-ux-tester: Worker 실패 fallback 환경에서도 결과 생성 버튼, 실패 배너, 3D 결과 흐름이 유지되어야 한다.
- code-reviewer: Worker lifecycle은 요청 1회 후 종료하고, 실패/timeout에서 dangling Worker가 남지 않아야 한다.
- nextjs-developer: Next.js static export 구조와 기존 순수 계산 엔진을 유지한다.

## 수용 기준

- Worker 응답은 요청 ID가 맞을 때만 결과로 반영된다.
- Worker 성공 후 `terminate()`가 호출된다.
- Worker 생성 실패 시 기존 메인 스레드 계산으로 결과를 만든다.
- Worker 실패 응답은 기존 계산 실패 배너가 처리할 수 있는 `Error`로 전달된다.
- 결과 생성 화면은 `runPackingEngineInWorker`를 호출한다.
- 빌드 후 생성되는 `out` 산출물은 TypeScript 소스 검사 대상에서 제외된다.
- `npm test`, `npx tsc --noEmit`, `npm run build`가 통과한다.
- 브라우저에서 결과 생성 후 3D가 ready 상태로 표시되고 console error가 없어야 한다.

## 공식 참고

- MDN Using Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
  - Worker는 background thread에서 작업을 수행하고, main thread와 `postMessage`/message event로 통신한다.
  - Worker 안에서는 DOM을 직접 조작하지 않는다.
  - bundler 환경에서는 `new URL("worker.js", import.meta.url)` 방식이 안전한 경로 해석에 도움이 된다.
- MDN Worker constructor: https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker
  - Worker 생성자는 script URL과 옵션을 받아 dedicated worker를 만든다.
