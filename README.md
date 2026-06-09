# Package Tetris

Package Tetris는 제한된 적재 공간에 박스형 화물을 어떻게 쌓을지 계산하고 3D로 확인하는 프론트엔드 단독 V1 도구입니다.

이 프로젝트는 물류 현장에서 팔레트, 컨테이너, 2.5톤반 같은 공간을 더 효율적으로 쓰기 위해 만들어졌습니다. 사용자는 공간과 박스 정보를 입력하고, 적재 결과, 미적재 수량, 쌓는 순서, 작업 지시서를 한 화면에서 확인할 수 있습니다.

## 제품 요약

- 대상 사용자: IT 도메인 지식이 없는 현장 작업자와 시연 담당자
- 핵심 목적: 공간 사용 효율을 높이고 적재 판단을 빠르게 보조
- V1 형태: 서버 없는 브라우저 기반 프론트엔드 도구
- 저장 방식: 같은 기기, 같은 브라우저의 IndexedDB 자동저장
- 백업 방식: JSON 백업 파일 만들기/가져오기
- 동기화 범위: 여러 기기 자동 동기화는 V2 서버 범위
- 현재 저장소: https://github.com/inshakr2/Package-Tetris

## 주요 기능

- 기본 공간 preset과 사용자가 직접 추가하는 내 공간 관리
- 저장된 박스 라이브러리와 현재 작업 박스 구성
- 실행 전 검토, 적재 계산, 미적재/경고 요약
- 3D 보기와 위/앞/옆 2D 보기
- 배치 상세, 쌓는 순서, 작업 지시서 복사/저장
- 추가 박스 시뮬레이션과 원본/추가 결과 비교
- 안전 여유 조정 추천과 추천 결과 미리보기
- 오프라인 재진입 안내, 저장 상태 확인, 백업 파일 보호

## 문서

- 개발 지식이 없는 사용자 시작 문서: [docs/non-developer-start-guide.md](docs/non-developer-start-guide.md)
- Windows 자동 실행 가이드: [docs/windows-cmd-launch-guide.md](docs/windows-cmd-launch-guide.md)
- 현장 시연 상세 가이드: [docs/field-demo-user-guide.md](docs/field-demo-user-guide.md)
- V1 완료 기준과 운영 전 파일럿 범위: [docs/v1-readiness.md](docs/v1-readiness.md)
- 개발 산출물과 기술 구조: [docs/development-deliverables.md](docs/development-deliverables.md)
- UI/UX 기획서: [docs/tetris-ui-planning-draft.md](docs/tetris-ui-planning-draft.md)

## V1 범위

V1은 프론트엔드 단독 제품입니다. 별도 서버, 계정, API route, DB 저장소 없이 브라우저 안에서 작업본을 저장하고 JSON 파일로 백업합니다.

운영 전에는 실제 현장 데이터 기준의 파일럿 확인이 필요합니다. 이 항목은 코드 개발 잔여가 아니라 현장 적용 전 검증 범위입니다.
