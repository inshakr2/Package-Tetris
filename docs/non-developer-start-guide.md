# Package Tetris 비개발자 시작 가이드

이 문서는 개발 지식이 없는 사용자가 어떤 문서부터 보면 되는지 안내하는 입구 문서다.

## 먼저 볼 문서

현장 시연을 준비하거나 직접 앱을 실행해야 한다면 아래 문서를 순서대로 확인한다.

1. Windows PC를 사용하고 자동 실행 파일로 열고 싶다면 [docs/windows-cmd-launch-guide.md](docs/windows-cmd-launch-guide.md)를 먼저 본다.
2. Node.js 설치, ZIP 다운로드, 앱 실행, 시연 순서까지 자세히 보려면 [docs/field-demo-user-guide.md](docs/field-demo-user-guide.md)를 본다.
3. V1 역사 기준과 운영 전 확인할 범위는 [docs/v1-readiness.md](docs/v1-readiness.md)를 본다. V2 현행 흐름은 현장 시연 가이드의 결과 확인/백업 순서를 따른다.

## Windows 사용자에게 권장하는 방식

Windows PowerShell에서 `npm.ps1` 오류가 나오거나 명령어 입력이 부담스럽다면 프로젝트에 포함된 자동 실행 파일을 사용한다.

- 실행 파일 위치: `scripts/windows-start-package-tetris.cmd`
- 관련 가이드: [docs/windows-cmd-launch-guide.md](docs/windows-cmd-launch-guide.md)

이 파일은 PowerShell이 아니라 Windows 명령 프롬프트 방식으로 `npm.cmd`를 실행하므로, PowerShell 실행 정책 문제를 피할 수 있다.

## 상세 시연 흐름

실제 시연 순서는 [docs/field-demo-user-guide.md](docs/field-demo-user-guide.md)에 정리되어 있다.

해당 문서에는 아래 내용이 포함되어 있다.

- Node.js 설치 방법
- GitHub ZIP 파일 받기
- 앱 실행 방법
- 현장 PC audit
- 포트 충돌 해결
- 오프라인 준비 확인
- 공간 선택, 박스 등록, 결과 확인, 백업 파일 만들기
- 자주 생기는 문제와 조치

## 개발자에게 전달할 문서

개발 구조, 기술 스택, 테스트 명령, V1 산출물은 [docs/development-deliverables.md](docs/development-deliverables.md)에 정리되어 있다.
