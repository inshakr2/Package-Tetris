# Package Tetris V1 Result Calculation Feedback

## Goal

현장 작업자가 `결과 만들기`를 누른 직후 앱이 멈춘 것처럼 느끼지 않도록 결과 계산 진행 상태를 표시하고, 계산 중 중복 실행을 막는다.

## Options Reviewed

1. **버튼 문구만 즉시 변경**
   - 장점: 변경 범위가 작다.
   - 단점: 동기 계산이 바로 끝나면 실제로 표시되지 않을 수 있고 중복 클릭 방지가 불완전하다.

2. **클라이언트 상태 + 짧은 비동기 틱**
   - 장점: 기존 추가 적재 계산 패턴과 같다. 버튼 비활성, 모바일 하단 액션, 결과 영역 재계산 CTA를 일관되게 제어할 수 있다.
   - 단점: 실제 장시간 계산 세부 진행률은 제공하지 않는다.

3. **Web Worker 기반 진행 단계**
   - 장점: 향후 대량 박스 계산에 강하다.
   - 단점: V1 마무리 범위 대비 구현과 검증 범위가 커진다.

## Decision

2번을 적용한다. V1에서는 계산 중 상태와 중복 클릭 방지가 핵심이며, 향후 Web Worker 전환 시에도 `creatingResult` 상태는 그대로 확장 포인트가 된다.

## Role Review

- **business-analyst:** 비개발 현장 사용자는 버튼 클릭 후 즉각적인 피드백이 필요하다. 계산 중 안내는 실행 신뢰도를 높인다.
- **ui-designer:** 데스크톱 검토 카드, 결과 영역, 모바일 하단 고정 CTA가 같은 문구와 비활성 상태를 사용해야 한다.
- **ui-ux-tester:** 360px/390px 모바일에서 버튼 문구가 넘치지 않아야 하며, 계산 중 CTA가 눌리지 않아야 한다.
- **code-reviewer:** 계산 완료/예외 모두에서 상태가 해제되어야 한다.

## Code Review Follow-up

- 계산을 한 tick 늦추면서 저장 충돌이 사이에 들어올 수 있으므로 `saveConflictRef`로 최신 충돌 상태를 동기 추적한다.
- 모든 작업본 변경 공통 관문과 결과 계산 타이머 콜백 진입부에서 최신 충돌 상태를 다시 확인한다.
- 컴포넌트 테스트 인프라가 아직 없으므로 현재 V1에서는 source/layout test로 guard 존재를 고정하고, V1.1에서 React 기반 상호작용 테스트 도입을 검토한다.

## Verification

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Browser: desktop/tablet/mobile width에서 핵심 CTA와 overflow 확인. 2026-06-09 최종 재검증 시 인앱 브라우저 viewport/DOM API가 타임아웃되어 자동 검증은 제한되었다.
