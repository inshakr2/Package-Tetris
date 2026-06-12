# Package Tetris V2 현재 산출물

이 문서는 현장 피드백 기반 V2에서 유지해야 할 주요 산출물, 기술 스택, 코드 구조, 검증 기준을 정리한다. V1 완료 기준은 `docs/v1-readiness.md`에 역사 기준으로 보관하고, 현재 개발과 시연 판단은 V2 문서와 `v2` 브랜치를 기준으로 한다.

## 제품 범위

Package Tetris는 프론트엔드 단독 적재 시뮬레이션 도구다. 사용자는 공간과 박스 정보를 입력하고, 실행 전 검토를 거쳐, 적재 결과를 3D/2D로 확인하며, JSON 백업 파일을 만들 수 있다.

V2 현재 범위:

- `기본 파레트`와 `오버행 파레트`를 포함한 현장 공간 preset
- 저장 박스 라이브러리의 무게, 상위그룹, 하위그룹, 검색, 그룹 관리
- 저장 박스와 현재 작업 물량의 `.xlsx 일괄등록`, 샘플 다운로드, 미리보기, 오류 행 안내
- 실행 전 확인의 작업별 배치 우선 설정과 `부분 지지 허용`
- 결과 화면의 3D 방향 화살표, 공간별 결과 확인, 남은 부피 KPI
- 추가 박스 시뮬레이션의 최대 3개 선택, 선택 순서 기반 우선순위, 추천/우선 결과 비교
- IndexedDB 자동저장, JSON 백업, 여러 탭 충돌 안내, 오프라인 재진입 보조

V2 현재 제외 범위:

- 서버 기반 여러 기기 자동 동기화
- 사용자 계정과 권한 관리
- API route와 서버 DB 저장
- WMS/TMS/ERP 연동
- 실제 운송 비용 계산과 배차 최적화
- 무게 중심, 파레트 총중량, 층별 하중 계산

## 기술 스택

- Next.js 16.2.7: App Router 기반 프론트엔드 앱
- React 19.2.7: 작업 화면 상태와 사용자 입력 UI
- Three.js 0.184.0: 3D 적재 결과 렌더링
- TypeScript 6.0.3: 도메인 모델, 적재 엔진, 검증 유틸 타입 안정성
- read-excel-file 9.1.1: 브라우저 `.xlsx` import 파싱
- lucide-react 1.17.0: 버튼과 상태 아이콘
- IndexedDB: 같은 기기, 같은 브라우저의 작업본 자동저장
- JSON 백업: 작업본 내보내기/가져오기와 기기 간 수동 이동
- Web Worker: 적재 계산 중 UI 멈춤을 줄이는 계산 실행 경로
- Service Worker: 앱 재진입과 오프라인 준비 상태 안내. 개발 모드에서는 서비스워커를 등록하지 않아 HMR 자동 새로고침 충돌을 막는다.
- Node test runner: 순수 유틸, 문서 기준, 레이아웃 문자열 검증
- fake-indexeddb: IndexedDB 저장 로직 테스트
- tsx 4.22.4: TypeScript 기반 field audit 스크립트 실행

## 앱 구조

주요 파일:

- `src/app/layout.tsx`: 앱 메타데이터와 공통 레이아웃
- `src/app/page.tsx`: Package Tetris 화면 진입점
- `src/app/manifest.ts`: PWA manifest
- `src/app/globals.css`: 반응형 레이아웃, 현장형 터치 타깃, 결과 화면 스타일
- `src/components/tetris-workspace-app.tsx`: 공간/박스/검토/결과/추가 시뮬레이션을 연결하는 메인 클라이언트 컴포넌트
- `src/components/result-stage/result-3d-canvas.client.tsx`: Three.js client-only 3D 결과 렌더링
- `src/components/pwa-service-worker-registrar.tsx`: production Service Worker 등록, 개발 모드 기존 등록 정리
- `public/sw.js`: 정적 리소스 캐시와 오프라인 재진입 보조

## 도메인 모델과 작업본

주요 파일:

- `src/lib/workspace/types.ts`: `TetrisWorkspace`, 공간, 박스, 결과, 정책 타입
- `src/lib/workspace/workspace-factory.ts`: 초기 작업본 생성
- `src/lib/workspace/workspace-migration.ts`: V1/V2 작업본 보정과 legacy 결과 정리
- `src/lib/workspace/presets.ts`: 기본 파레트, 오버행 파레트, 컨테이너, 2.5톤반 공간
- `src/lib/workspace/block-library.ts`: 저장된 박스 템플릿과 현재 작업 박스 연결
- `src/lib/workspace/block-groups.ts`: 상위그룹/하위그룹 registry 관리
- `src/lib/workspace/space-form-validation.ts`: 내 공간 치수와 안전 여유 검증
- `src/lib/workspace/review-gate.ts`: 실행 전 검토와 엔진 입력 생성

작업본은 `schemaVersion`, `appVersion`, `fileId`, `revision`, `deviceId`, 공간 목록, 박스 템플릿, 그룹 registry, 현재 작업, 적재 정책, 최근 결과, 추가 시뮬레이션 이력을 포함한다.

## 저장과 백업

주요 파일:

- `src/lib/persistence/indexed-db.ts`: IndexedDB 저장, 복원, 충돌 감지
- `src/lib/persistence/json-transfer.ts`: JSON export/import, 충돌 판정, 복사본 열기
- `src/lib/persistence/storage-health.ts`: 저장소 상태, 용량, 백업 리마인더
- `src/lib/persistence/workspace-sync-channel.ts`: 같은 브라우저의 여러 탭 충돌 감지
- `src/lib/workspace/workspace-backup-file.ts`: 백업 파일명 생성
- `src/lib/workspace/import-conflict-copy.ts`: 가져오기 충돌 안내 문구

V2는 서버 저장이 아니므로 브라우저 저장소와 JSON 백업을 함께 사용한다. 중요한 작업은 현장 종료 전 반드시 백업 파일로 보관해야 한다.

## 엑셀 import

주요 파일:

- `src/lib/workspace/block-template-xlsx-import.ts`: 저장 박스 `.xlsx 일괄등록` 파싱, 검증, 샘플 생성
- `src/lib/workspace/draft-block-xlsx-import.ts`: 현재 작업 물량 `.xlsx 일괄등록` 파싱, 검증, 샘플 생성
- `src/lib/workspace/block-template-xlsx-import.test.ts`: 저장 박스 import 회귀 테스트
- `src/lib/workspace/draft-block-xlsx-import.test.ts`: 현재 작업 import 회귀 테스트

저장 박스 import는 `상위그룹`, `하위그룹`, `박스명`, `가로mm`, `세로mm`, `높이mm`, `무게kg`, `깨짐주의` 컬럼을 사용한다. 현재 작업 import는 저장된 박스명을 기준으로 `박스명`, `작업수량`, `적재위치타입`만 받는다. `적재위치타입`은 1=기본, 2=아래우선을 사용하며, 기존 파일 호환을 위해 `아래층우선타입` 컬럼은 읽기만 지원한다. 두 import 모두 컬럼명 기준으로 값을 읽어 열 순서가 바뀌어도 동작하며, 파일 선택 즉시 반영하지 않고 미리보기와 오류 행 확인 후 적용한다. 현재 작업 import의 중복 행은 오류가 아니라 합산 미리보기로 처리하고, 같은 박스명의 적재위치타입이 다르면 기존 설정 유지 경고를 보여준다.

## 적재 엔진과 안전 검증

주요 파일:

- `src/lib/workspace/packing-engine.ts`: V0 적재 엔진
- `src/lib/workspace/packing-placement.ts`: 회전 후보, 바닥 지지, 충돌 없는 위치 탐색
- `src/lib/workspace/packing-output-safety.ts`: 엔진 결과의 공중 배치, 겹침, 정책 위반 방지
- `src/lib/workspace/packed-result-validation.ts`: 결과 정합성 검증
- `src/lib/workspace/packing-worker.ts`: Worker에서 실행할 계산 진입점
- `src/lib/workspace/packing-worker-client.ts`: 앱에서 Worker 계산을 호출하는 클라이언트 래퍼
- `src/lib/workspace/chain-simulation.ts`: 기존 결과 유지 기반 단일 추가 적재 시뮬레이션
- `src/lib/workspace/multi-chain-simulation.ts`: 최대 3개 추가 박스의 추천/선택 순서 우선/박스별 우선 결과 비교
- `src/lib/workspace/result-offset-recommendation.ts`: 안전 여유 조정과 오버행 검토 추천

엔진은 박스를 단위 수량으로 펼친 뒤, 작업별 배치 우선도, fragile 정책, 회전 가능성, 부분 지지 정책, 바닥 면적, 부피 기준으로 배치 우선순위를 정한다. `부분 지지 허용`이 켜져 있으면 받침면 55% 이상인 배치를 허용하고, 꺼져 있으면 전체 받침면 기준을 유지한다.

## 결과 확인과 현장 작업 흐름

주요 파일:

- `src/lib/workspace/result-viewer-controls.ts`: 3D, 위, 앞, 옆 보기 제어
- `src/lib/workspace/projection-view.ts`: 2D 투영 보기 데이터 생성
- `src/lib/workspace/packing-scene.ts`: 3D scene 데이터와 방향 화살표 정보 생성
- `src/lib/workspace/result-warning-summary.ts`: 경고 요약
- `src/lib/workspace/result-remaining-volume.ts`: 남은 부피 KPI
- `src/lib/workspace/field-handoff-checklist.ts`: 현장 전달 전 점검

결과 화면은 적재 결과를 크게 보여주고, 현장 작업자는 3D가 실패해도 위/앞/옆 보기로 적재 상태를 확인할 수 있다. 3D에서는 원래 입력 높이 방향을 화살표로 확인할 수 있으며, 복잡한 결과에서는 방향 표시를 끌 수 있다.

## 현장 UX 산출물

- 공간 라이브러리: 기본 공간, 내 공간 추가/수정, 기본 파레트와 오버행 파레트
- 박스 라이브러리: 저장된 박스 검색, 상위/하위 그룹 필터, 그룹 관리, 현재 작업 재사용
- 실행 전 확인: 입력 오류, 경고, 총 부피, 배치 우선 설정, 부분 지지 허용 안내
- 3D 결과 보기: 자유시점, 위/앞/옆 보기, 크게 보기, `결과 최대치수` 오버레이, 방향 화살표
- 추가 박스 시뮬레이션: 저장 박스 최대 3개 선택, 선택 순서 기반 우선순위, 수량 지정, 결과 비교와 반영/취소
- 안전 여유/오버행 추천: 공간 하나가 더 필요한 아쉬운 상황에서 검토값 제안
- 저장 보호: 자동저장, 백업 파일, 여러 탭 충돌, 오프라인 준비 안내

## 검증 기준

V1 역사 기준 검증:

```bash
npm run v1:verify
```

V2 브랜치 마감 검증:

```bash
npm run v2:verify
```

위 명령은 아래 작업을 순서대로 실행한다.

- `npm test`: Node test runner 기반 단위/문서/레이아웃 테스트
- `npx tsc --noEmit`: TypeScript 타입 검사
- `npm run field:audit`: 현장형 preset 대량 적재 audit와 V2 핵심 기능 검증
- `npm run build`: Next.js production build
- `git diff --check`: 커밋 전 공백 오류 검사

현장 audit 스크립트:

- `scripts/field-audit.ts`
- 팔레트 기본 대량 혼합 박스
- 20ft GP 장척 박스 혼합
- 2.5톤반 낮은 짐칸 혼합
- 부분 지지 허용 55% 현장 검증
- 오버행 파레트 추천 현장 검증
- 현장 바람개비 적재 검증 - 기본 8개
- 현장 바람개비 적재 검증 - 치수 순서 변형
- 현장 바람개비 적재 검증 - 9개 경계
- 현장 바람개비 적재 검증 - 주변 치수
- 저장 박스 엑셀 일괄등록 현장 검증
- 현재 작업 엑셀 등록 현장 검증
- 추가 박스 시뮬레이션 현장 검증
- 현장 바람개비 적재 검증 - 혼합 추가 시뮬레이션 결과

UI 변경 시 추가 확인:

- 360px, 390px, 768px, 1280px에서 horizontal overflow 없음
- 주요 버튼과 입력은 44~48px 이상 터치 타깃 유지
- 결과 생성 후 3D canvas가 비어 있지 않고, WebGL 실패 시 2D 대체 동작 유지

## 문서 산출물

- `README.md`: 프로젝트 소개와 문서 허브
- `docs/non-developer-start-guide.md`: 개발 지식 없는 사용자의 시작 문서
- `docs/windows-cmd-launch-guide.md`: Windows `.cmd` 자동 실행 가이드
- `docs/field-demo-user-guide.md`: 현장 시연 상세 가이드
- `docs/v1-readiness.md`: V1 역사 완료 기준과 운영 전 파일럿 확인 범위
- `docs/tetris-ui-planning-draft.md`: UI/UX 기획서
- `docs/plans/2026-06-10-v2-field-feedback-roadmap.md`: V2 현장 피드백 로드맵
- `docs/agents/*.md`: PM, BA, UI, QA, 개발 역할 메모리
- `docs/plans/*.md`: 기능 증분별 개발 계획 기록

## 후속 후보

- 서버 기반 여러 기기 자동 동기화
- 사용자 계정과 팀별 작업본 관리
- 실제 현장 데이터 기반 벤치마크 확대
- WMS/TMS/ERP 연동
- 차량/컨테이너별 운영 비용과 배차 조건 반영
- 무게 중심, 파레트 총중량, 층별 하중 검토
