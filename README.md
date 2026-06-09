# Package Tetris

Package Tetris는 제한된 적재 공간에 박스형 화물을 어떻게 쌓을지 계산하고 3D로 확인하는 프론트엔드 단독 V1 도구입니다.

- 저장 방식: 같은 기기, 같은 브라우저의 IndexedDB 자동저장
- 백업 방식: JSON 백업 파일 만들기/가져오기
- 동기화 범위: 여러 기기 자동 동기화는 V2 서버 범위
- 현재 저장소: https://github.com/inshakr2/Package-Tetris

## 빠른 실행

```bash
npm install
npm run field:audit
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

`npm run field:audit`은 팔레트, 20ft GP, 2.5톤반 기준 현장형 시나리오의 적재 안전성과 계산 시간을 현재 PC에서 다시 확인합니다.

## 현장 시연 문서

Node.js 설치, ZIP 다운로드, Git 다운로드, 포트 충돌, 오프라인 준비, 실제 시연 순서는 [docs/field-demo-user-guide.md](docs/field-demo-user-guide.md)를 확인하세요.

V1 완료 기준과 운영 전 파일럿 확인 범위는 [docs/v1-readiness.md](docs/v1-readiness.md)를 기준으로 봅니다.

## 개발 검증

```bash
npm run v1:verify
```

위 명령은 V1 마감 기준으로 테스트, 타입 검사, 현장 audit, 프로덕션 빌드를 순서대로 실행합니다.

개별로 확인할 때는 아래 명령을 사용합니다.

```bash
npm test
npx tsc --noEmit
npm run field:audit
npm run build
```

UI 변경 후에는 360px, 390px, 768px, 1280px 기준에서 가로 넘침과 주요 버튼 동작을 확인합니다.
