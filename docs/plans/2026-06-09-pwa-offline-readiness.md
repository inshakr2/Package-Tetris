# PWA 오프라인 재진입 준비

## PM 판단

V1은 서버 없이 IndexedDB 자동저장과 백업 파일로 운영한다. 이번 증분은 여러 기기 동기화나 서버 저장을 추가하지 않고, 현장 작업자가 한 번 열어 둔 앱 화면을 네트워크 불안정 상황에서도 다시 열 수 있도록 서비스워커 기반 앱 셸 캐시를 추가한다.

서비스워커는 작업 데이터의 영구 보존 수단이 아니다. 커스텀 공간, 박스, 결과는 기존 IndexedDB와 백업 파일 정책을 유지하며, UI 문구도 `백업 파일`을 실제 복구 수단으로 안내한다.

## 검토한 접근

1. 설치 프롬프트까지 포함한 PWA 완성형
   - 장점: 데스크톱/태블릿에서 앱처럼 실행하는 경험을 제공한다.
   - 단점: 브라우저별 설치 조건과 안내 문구가 달라 V1 마무리 범위가 커진다.
2. 서비스워커 앱 셸 캐시 1차
   - 장점: Next.js static export 구조와 맞고, 오프라인 재진입 안정성을 가장 직접적으로 높인다.
   - 단점: 데이터 동기화나 완전한 오프라인 운영을 보장하지는 않는다.
3. 네트워크 상태 안내만 유지
   - 장점: 구현 위험이 가장 낮다.
   - 단점: 인터넷이 끊긴 뒤 새로고침/재진입 상황을 개선하지 못한다.

채택: 2번. 설치 프롬프트와 여러 기기 자동 동기화는 후속 범위로 둔다.

## 적용 내용

- `public/sw.js`를 추가해 루트 화면, manifest, icon, Next.js 앱 셸 asset을 캐시한다.
- navigation 요청은 network-first로 처리하고, 네트워크 실패 시 캐시된 `/`로 되돌린다.
- 클라이언트 등록 컴포넌트는 서비스워커 지원 여부, 준비 중, 준비 완료, 실패 상태를 앱에 전달한다.
- 저장 보호 패널에 `오프라인 준비` 행을 추가한다.
- 준비 완료 상태도 `백업 파일을 대체하지 않는다`고 안내한다.

## 역할별 검토

- business-analyst: 현장 작업자는 네트워크 상태보다 “현재 작업을 잃지 않는가”를 더 중요하게 본다. 따라서 서비스워커 문구는 보조 안전장치로 제한하고 백업 파일 행동을 유지한다.
- ui-designer: 저장 보호 패널 안에 한 행으로 넣어 별도 배너를 늘리지 않는다. 화면을 막지 않고 `확인 중`, `준비 중`, `준비됨`, `준비 실패`처럼 상태를 읽기 쉽게 표시한다.
- ui-ux-tester: 모바일에서 저장 패널이 길어질 수 있으므로 기존 bottom sheet 스크롤 구조 안에 배치한다. 기술어 `service worker`는 화면에 노출하지 않는다.
- code-reviewer: 서비스워커 캐시는 same-origin GET만 처리하고, navigation fallback은 캐시된 루트로 제한한다. 상태 계산은 순수 함수 테스트로 고정한다.
- nextjs-developer: `output: "export"` 구조를 유지하고, 서버 API나 인증을 추가하지 않는다.

## 수용 기준

- 서비스워커 지원 브라우저에서 `/sw.js`가 등록된다.
- 앱 셸 캐시 이름은 `package-tetris-app-shell-v1`이다.
- 오프라인 준비 행은 저장 보호 패널에서 확인할 수 있다.
- 서비스워커 미지원/등록 실패는 앱 오류가 아니라 안내 상태로 처리한다.
- `npm test`, `npx tsc --noEmit`, `npm run build`가 통과한다.
- 브라우저 검증에서 서비스워커 등록, 캐시 생성, 320/390/768/1440px 가로 넘침 없음, 콘솔 오류 없음이 확인된다.

## 공식 참고

- Next.js PWA guide: https://en.nextjs.im/docs/app/guides/progressive-web-apps
  - App Router 환경에서 manifest와 `/sw.js` 등록 흐름을 제공한다.
- MDN Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  - 서비스워커는 웹 앱, 브라우저, 네트워크 사이에서 요청을 가로채고 오프라인 경험을 만들기 위한 worker다.
- MDN Offline and background operation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
  - 오프라인 동작은 서비스워커가 리소스를 캐시에 추가하고 fetch 이벤트를 처리하는 구조로 동작한다.
- MDN Using Service Workers: https://developer.mozilla.org/docs/Web/API/Service_Worker_API/Using_Service_Workers
  - `fetch` 이벤트와 `respondWith()`를 통해 캐시 또는 네트워크 응답을 선택할 수 있다.
