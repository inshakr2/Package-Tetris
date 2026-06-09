# 현장 반응형 overflow 회귀 안전장치

## PM 판단

V1 시연 기준에서 새 기능을 하나 더 추가하는 것보다, 현장 작업자가 360px 모바일, 390px 모바일, 768px 태블릿, 1280px PC에서 결과 화면을 끝까지 볼 수 있는 안정성이 더 중요하다. 특히 결과 요약, 2D/3D 보기, 추천 미리보기 dialog는 캔버스와 긴 한글 문구가 함께 있어 작은 화면에서 가로 overflow가 생기기 쉽다.

검토한 방법:

1. Playwright 같은 브라우저 E2E 의존성 추가
   - 장점: 실제 viewport 검증을 자동화할 수 있다.
   - 단점: V1 마감 단계에서 새 의존성과 실행 시간을 늘린다.
2. 기존 source-level layout test에 overflow 계약 추가
   - 장점: 현재 test runner만으로 빠르게 회귀를 잡고, CSS 누락을 명확히 고정한다.
   - 단점: 실제 렌더링 픽셀 검증은 브라우저 확인을 병행해야 한다.
3. CSS에 `overflow-x: hidden`만 전역 추가
   - 장점: 화면 밀림을 즉시 숨길 수 있다.
   - 단점: 실제 원인과 접근성 문제를 가릴 수 있다.

채택: 2번. 핵심 결과 컨테이너가 grid/flex 부모 안에서 부모 폭을 밀어내지 않도록 `min-width: 0`과 `overflow: hidden` 계약을 테스트로 고정한다.

## Role Review

- business-analyst: 현장 작업자는 화면이 옆으로 밀리면 계산 결과 자체를 불신할 수 있으므로, 결과 화면 안정성은 기능 추가보다 우선한다.
- ui-designer: 결과 요약과 3D 보기의 시각 구조는 유지하고, 레이아웃 방어 CSS만 추가해 화면 밀도를 바꾸지 않는다.
- ui-ux-tester: 360px, 390px, 768px, 1280px에서 horizontal overflow가 없어야 하며, 특히 3D/2D 보드와 추천 미리보기 dialog를 확인한다.
- code-reviewer: 전역 overflow 숨김 대신 문제 컨테이너별 min-width 계약을 추가해 회귀를 테스트로 남긴다.
- nextjs-developer: UI 마크업은 유지하고 `globals.css`와 source-level layout test만 좁게 변경한다.

## Acceptance Criteria

- 결과 요약, 결과 하단 그리드, 결과 작업공간 그리드가 `min-width: 0`을 가진다.
- 2D 보드, 3D shell, 3D host, 확대/추천 dialog 안의 3D shell이 `min-width: 0`을 가진다.
- 2D/3D 시각 컨테이너는 캔버스나 박스가 부모 폭을 밀어내지 않도록 `overflow: hidden`을 유지한다.
- 기존 결과 뷰어, 확대 3D, offset 추천 layout test가 함께 통과한다.
- 브라우저 확인에서 주요 viewport의 document 가로 overflow가 없어야 한다.

## Verification Notes

- `npm test`: 288 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Browser viewport check: demo result screen measured at 360px, 390px, 768px, 1280px.
- 3D result view: document horizontal overflow was 0 at all measured widths.
- 2D top view: document horizontal overflow was 0 at all measured widths, and `.projection-board` computed `min-width: 0px`, `overflow: hidden`.
