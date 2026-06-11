# Package Tetris 개발 산출물

이 문서는 Package Tetris V1 개발 과정에서 만들어진 주요 산출물, 기술 스택, 코드 구조, 검증 기준을 정리한다.

## 제품 범위

Package Tetris V1은 프론트엔드 단독 적재 시뮬레이션 도구다. 사용자는 공간과 박스 정보를 입력하고, 적재 결과를 3D/2D로 확인하며, JSON 백업 파일을 만들 수 있다.

V1 제외 범위:

- 서버 기반 여러 기기 자동 동기화
- 사용자 계정과 권한 관리
- API route와 서버 DB 저장
- WMS/TMS/ERP 연동
- 실제 운송 비용 계산과 배차 최적화

## 기술 스택

- Next.js 16.2.7: App Router 기반 프론트엔드 앱
- React 19.2.7: 작업 화면 상태와 사용자 입력 UI
- Three.js 0.184.0: 3D 적재 결과 렌더링
- TypeScript 6.0.3: 도메인 모델, 적재 엔진, 검증 유틸 타입 안정성
- lucide-react 1.17.0: 버튼과 상태 아이콘
- IndexedDB: 같은 기기, 같은 브라우저의 작업본 자동저장
- JSON 백업: 작업본 내보내기/가져오기와 기기 간 수동 이동
- Web Worker: 적재 계산 중 UI 멈춤을 줄이는 계산 실행 경로
- Service Worker: 앱 재진입과 오프라인 준비 상태 안내
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
- `src/components/pwa-service-worker-registrar.tsx`: Service Worker 등록
- `public/sw.js`: 정적 리소스 캐시와 오프라인 재진입 보조

## 도메인 모델과 작업본

주요 파일:

- `src/lib/workspace/types.ts`: `TetrisWorkspace`, 공간, 박스, 결과, 정책 타입
- `src/lib/workspace/workspace-factory.ts`: 초기 작업본 생성
- `src/lib/workspace/presets.ts`: 팔레트, 컨테이너, 2.5톤반 등 기본 공간과 안전 여유
- `src/lib/workspace/block-library.ts`: 저장된 박스 템플릿과 현재 작업 박스 연결
- `src/lib/workspace/space-form-validation.ts`: 내 공간 치수와 안전 여유 검증
- `src/lib/workspace/review-gate.ts`: 실행 전 검토와 엔진 입력 생성

작업본은 `schemaVersion`, `appVersion`, `fileId`, `revision`, `deviceId`, 공간 목록, 박스 템플릿, 현재 작업, 최근 결과, 추가 시뮬레이션 이력을 포함한다.

## 저장과 백업

주요 파일:

- `src/lib/persistence/indexed-db.ts`: IndexedDB 저장, 복원, 충돌 감지
- `src/lib/persistence/json-transfer.ts`: JSON export/import, 충돌 판정, 복사본 열기
- `src/lib/persistence/storage-health.ts`: 저장소 상태, 용량, 백업 리마인더
- `src/lib/persistence/workspace-sync-channel.ts`: 같은 브라우저의 여러 탭 충돌 감지
- `src/lib/workspace/workspace-backup-file.ts`: 백업 파일명 생성
- `src/lib/workspace/import-conflict-copy.ts`: 가져오기 충돌 안내 문구

V1은 서버 저장이 아니므로 브라우저 저장소와 JSON 백업을 함께 사용한다. 중요한 작업은 현장 종료 전 반드시 백업 파일로 보관해야 한다.

## 적재 엔진과 안전 검증

주요 파일:

- `src/lib/workspace/packing-engine.ts`: V0 적재 엔진
- `src/lib/workspace/packing-placement.ts`: 회전 후보, 바닥 지지, 충돌 없는 위치 탐색
- `src/lib/workspace/packing-output-safety.ts`: 엔진 결과의 공중 배치, 겹침, 정책 위반 방지
- `src/lib/workspace/packed-result-validation.ts`: 결과 정합성 검증
- `src/lib/workspace/packing-worker.ts`: Worker에서 실행할 계산 진입점
- `src/lib/workspace/packing-worker-client.ts`: 앱에서 Worker 계산을 호출하는 클라이언트 래퍼
- `src/lib/workspace/chain-simulation.ts`: 기존 결과 유지 기반 추가 적재 시뮬레이션
- `src/lib/workspace/multi-chain-simulation.ts`: 최대 3개 추가 박스의 추천/사용자 지정 우선/박스별 우선 결과 비교
- `src/lib/workspace/result-offset-recommendation.ts`: 안전 여유 조정 추천

엔진은 박스를 단위 수량으로 펼친 뒤, 작업별 하단 우선도, fragile 정책, 회전 가능성, 부분 지지 정책, 바닥 면적, 부피 기준으로 배치 우선순위를 정한다. 각 박스는 기존 공간에 먼저 배치하고, 불가능하면 새 공간을 연다.

## 결과 확인과 현장 작업 흐름

주요 파일:

- `src/lib/workspace/result-viewer-controls.ts`: 3D, 위, 앞, 옆 보기 제어
- `src/lib/workspace/projection-view.ts`: 2D 투영 보기 데이터 생성
- `src/lib/workspace/result-warning-summary.ts`: 경고 요약
- `src/lib/workspace/result-remaining-volume.ts`: 남은 부피 KPI
- `src/lib/workspace/field-handoff-checklist.ts`: 현장 전달 전 점검

결과 화면은 적재 결과를 크게 보여주고, 현장 작업자는 3D가 실패해도 위/앞/옆 보기로 적재 상태를 확인할 수 있다.

## 현장 UX 산출물

- 공간 라이브러리: 기본 공간과 내 공간 추가/수정
- 박스 라이브러리: 저장된 박스를 검색하고 현재 작업에 재사용
- 실행 전 확인: 입력 오류와 경고를 현장 언어로 표시
- 3D 결과 보기: 자유시점, 위/앞/옆 보기, 크게 보기, 치수 오버레이
- 추가 적재 시뮬레이션: 원본과 추가 결과 비교, 결과 반영
- 안전 여유 추천: 공간 하나가 더 필요한 아쉬운 상황에서 검토값 제안
- 저장 보호: 자동저장, 백업 파일, 여러 탭 충돌, 오프라인 준비 안내

## 검증 기준

V1 통합 검증:

```bash
npm run v1:verify
```

위 명령은 아래 작업을 순서대로 실행한다.

- `npm test`: Node test runner 기반 단위/문서/레이아웃 테스트
- `npx tsc --noEmit`: TypeScript 타입 검사
- `npm run field:audit`: 현장형 preset 대량 적재 audit
- `npm run build`: Next.js production build

현장 audit 스크립트:

- `scripts/field-audit.ts`
- 팔레트 기본 대량 혼합 박스
- 20ft GP 장척 박스 혼합
- 2.5톤반 낮은 짐칸 혼합

## 문서 산출물

- `README.md`: 프로젝트 소개와 문서 허브
- `docs/non-developer-start-guide.md`: 개발 지식 없는 사용자의 시작 문서
- `docs/windows-cmd-launch-guide.md`: Windows `.cmd` 자동 실행 가이드
- `docs/field-demo-user-guide.md`: 현장 시연 상세 가이드
- `docs/v1-readiness.md`: V1 완료 기준과 운영 전 파일럿 확인 범위
- `docs/tetris-ui-planning-draft.md`: UI/UX 기획서
- `docs/agents/*.md`: PM, BA, UI, QA, 개발 역할 메모리
- `docs/plans/*.md`: 기능 증분별 개발 계획 기록

## 후속 후보

- 서버 기반 여러 기기 자동 동기화
- 사용자 계정과 팀별 작업본 관리
- 실제 현장 데이터 기반 벤치마크 확대
- WMS/TMS/ERP 연동
- 차량/컨테이너별 운영 비용과 배차 조건 반영
