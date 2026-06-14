# Package Tetris V3 Product Direction Plan

작성일: 2026-06-15
작성 역할: product-manager + business-analyst
검토 역할: ui-designer, ui-ux-tester, code-reviewer, nextjs-developer
기준 브랜치: `v2`

## 1. Purpose

이 문서는 V2 현장 피드백 반영이 안정화된 이후, 다음 현장 피드백이 오기 전까지 Package Tetris를 어떤 방향으로 발전시킬지 정리한 V3 작업 계획서다.

V3는 단순히 적재 계산 기능을 더 붙이는 단계가 아니다. V2는 이미 현장 작업자가 한 기기에서 공간 선택, 박스 등록, 현재 작업 구성, 실행 전 확인, 결과 확인, 추가 박스 시뮬레이션, 백업까지 수행할 수 있는 상태다. V3의 핵심은 이 제품을 반복 업무에서 더 오래 쓸 수 있는 현장 작업 도구로 정리하는 것이다.

## 2. Current Product Summary

Package Tetris V2의 현재 장점은 다음과 같다.

- 프론트엔드 단독 구조로 서버 없이 현장 PC에서 시연과 테스트가 가능하다.
- 기본 파레트, 오버행 파레트, 컨테이너, 2.5톤반 등 현장 공간 preset을 제공한다.
- 저장 박스 라이브러리, 상위/하위 그룹, 박스 검색, 그룹 관리, `.xlsx` 일괄등록을 제공한다.
- 현재 작업 물량도 `.xlsx`로 등록할 수 있고, 저장 박스명 기준 검증을 수행한다.
- 실행 전 확인에서 아래 우선, 부분 지지 허용, 총 부피, 오류/경고 상태를 확인할 수 있다.
- 결과 화면에서 3D/2D 보기, 방향 화살표, 결과 최대치수, 남은 부피, 오버행/안전 여유 추천을 확인할 수 있다.
- 추가 박스 시뮬레이션에서 최대 3개 박스, 선택 순서 기반 우선순위, 수량 지정, 추천/우선 결과 비교를 제공한다.
- IndexedDB 자동저장, JSON 백업, 여러 탭 충돌 안내, PWA 오프라인 재진입 보조가 준비되어 있다.
- `npm run v2:verify`와 `npm run field:audit`로 엔진, 문서, 타입, 빌드 기준을 한 번에 검증할 수 있다.

현재 약점은 다음과 같다.

- 화면과 상태 연결이 `src/components/tetris-workspace-app.tsx`에 과도하게 집중되어 있어 V3 규모의 UI 재구성이나 서버 동기화 준비에 불리하다.
- V2 화면은 현장 시연에는 적합하지만, 반복 업무 기준으로는 긴 세로 흐름과 모달 누적이 부담이 된다.
- 작업 단위, 작업 이력, 결과 비교, 승인, 책임자 확인 같은 업무 맥락이 데이터 모델에 충분히 분리되어 있지 않다.
- 브라우저 검증 일부는 source-level guard에 의존한다. 실제 브라우저에서 증거를 자동으로 남기는 체계가 더 필요하다.
- 적재 엔진은 현장 주요 fixture를 보강했지만, 대량 수량, 추가 시뮬레이션 반복 계산, 고밀도 3D 렌더링에서는 성능 guard가 더 필요하다.
- 다기기 이어하기, 팀 공유, 승인 이력, 서버 백업은 아직 V2 범위 밖이다.

## 3. Role Discussion Summary

### 3.1 Business Analyst

V3는 `더 좋은 계산기`보다 `현장 업무 도구화`에 초점을 맞춘다. 현장에서는 계산 결과 자체만큼 작업 단위 관리, 다시 열기, 다른 사람에게 설명하기, 위험 옵션을 누가 승인했는지 남기는 일이 중요하다.

BA 관점의 우선순위는 다음과 같다.

- 작업 단위 중심의 흐름을 만든다.
- 같은 기기 저장과 JSON 백업을 넘어, 추후 서버 동기화로 확장 가능한 작업본 구조를 준비한다.
- 결과를 현장에 전달할 수 있는 요약 산출물을 만든다. 단, V2에서 제거한 배치상세/쌓는순서 표를 되살리는 방식은 지양한다.
- 부분 지지 허용, 오버행 파레트처럼 공격적인 옵션은 추천, 적용, 승인, 백업 이력을 분리해야 한다.
- 무게는 현재 검색/백업 metadata다. 실제 계산 반영은 무게 중심, 총중량, 층별 하중 모델을 정의한 뒤 별도 범위로 다룬다.

### 3.2 UI Designer

V2의 한 화면 세로 흐름은 기능을 빠르게 모으기에는 좋았지만, 저장 박스 200개 이상, 반복 계산, 결과 비교가 늘어나면 사용성이 떨어진다. V3는 완전한 마케팅형 화면이나 전체 wizard 재작성보다 `현장 작업대(workbench)` 구조가 적합하다.

UI 방향은 다음과 같다.

- 데스크톱은 좌측 단계/작업 목록, 중앙 작업 영역, 우측 요약 패널의 3영역 구조를 검토한다.
- 태블릿은 중앙 작업 영역을 우선하고 요약/도구 패널을 접이식으로 둔다.
- 박스 라이브러리와 현재 작업은 카드 위주가 아니라 검색/필터/선택/수량 편집이 빠른 테이블형 작업대로 정리한다.
- 결과 화면은 공간 목록, 3D/2D 뷰어, 경고/추천/범례를 한 화면에서 오갈 수 있게 재구성한다.
- 추가 박스 시뮬레이션은 긴 하단 섹션보다 결과 화면의 탭 또는 패널로 통합하는 편이 낫다.
- 부분 지지/오버행/추가 시뮬레이션은 자동 적용처럼 보이면 안 되며, 사용자가 검토 중인 대안이라는 시각적 구분이 필요하다.

### 3.3 UI/UX Tester

V3는 기능 수보다 `검증 가능한 사용성`을 강화해야 한다. 특히 현장 사용자는 개발자 도구를 보지 않으므로 화면 깨짐, 저장 실패, 가져오기 오류, WebGL 실패, 오프라인 재진입 같은 상황을 실제 브라우저 기준으로 검증해야 한다.

QA 방향은 다음과 같다.

- 360px, 390px, 768px, 1280px에서 주요 플로우의 스크린샷과 overflow 결과를 자동으로 남긴다.
- production build 기준으로 IndexedDB 복원, JSON 가져오기, PWA 재진입, WebGL fallback을 검증한다.
- 키보드 이동, focus order, aria label, 색 대비, 125% zoom 같은 접근성 검증을 source-level guard 이상으로 확장한다.
- 검증 문서는 특정 커밋의 증거라는 점을 명확히 하고, 현재 HEAD와 어긋나면 완료처럼 표현하지 않는다.
- 모바일 지원 수준은 `정식 지원`, `제약형 지원`, `참고 검토용` 중 하나로 문서에서 명확히 선언한다.

### 3.4 Code Reviewer

V3의 주요 리스크는 엔진과 UI가 동시에 커지는 것이다. 특히 현재 엔진은 입력 수량을 단위 박스로 펼치는 구조가 있어 대량 수량과 추가 시뮬레이션 permutation이 커질 때 성능 문제가 생길 수 있다.

코드 리뷰 관점의 우선순위는 다음과 같다.

- 추가 박스 시뮬레이션과 적재 엔진의 공통 geometry/metrics 로직을 분리한다.
- 빠른 PR 검증과 무거운 현장 audit/performance 검증을 구분한다.
- Web Worker fallback이 조용히 main thread로 내려가는 경우 사용자와 개발자가 모두 알 수 있게 한다.
- 입력 수량, 박스 수, 시뮬레이션 후보 수에 대한 추정 시간과 제한 기준을 둔다.
- 안전 검증은 통과/실패뿐 아니라 실패 이유 코드를 남겨 디버깅 가능하게 만든다.

### 3.5 Next.js Developer

V2 구조는 프론트 단독 제품으로 합리적이지만, V3를 그대로 얹으면 유지보수 비용이 빠르게 커진다. 서버부터 도입하기보다 먼저 프론트 구조를 분해하고, 작업본 document model을 정리한 뒤 서버 동기화 여부를 판단하는 것이 안전하다.

개발 관점의 우선순위는 다음과 같다.

- `tetris-workspace-app.tsx`를 workspace shell, storage shell, import shell, result shell, simulation shell로 단계적으로 분리한다.
- `globals.css`도 화면/컴포넌트 책임별로 정리할 준비가 필요하다.
- IndexedDB 작업본을 다중 workspace, snapshot, 최근 백업, 검증 증거와 연결 가능한 document model로 확장한다.
- import 검증, backup 압축/검증, migration check는 Web Worker로 확장할 수 있다.
- Three.js는 고밀도 결과에서 `InstancedMesh`와 capture/interact 모드 분리를 검토한다.
- 서버 동기화는 V3 Core가 아니라 V3+ 또는 V4로 분리하되, V3 Core에서 그 전제 조건을 준비한다.

## 4. Product Direction Options

### Option A. Engine-First Optimization

적재 엔진 최적화, 후보 탐색 확대, 성능 개선을 V3의 최우선으로 두는 접근이다.

장점:

- 제품의 근본 가치인 적재 효율을 직접 개선한다.
- 현장 피드백에서 반복적으로 지적된 정합성 불안을 줄일 수 있다.

단점:

- 이미 V2에서 주요 field fixture를 보강했기 때문에, 엔진만 계속 손보면 사용자 경험과 업무 흐름 개선이 뒤로 밀린다.
- UI와 작업본 구조가 그대로이면 엔진 개선 효과를 현장에서 설명하고 검증하기 어렵다.

판단: V3 Core의 한 축으로 포함하되, 단독 최우선 전략으로 채택하지 않는다.

### Option B. Server-First Collaboration

서버, 계정, DB, 여러 기기 동기화를 먼저 도입하는 접근이다.

장점:

- 현장 PC, 태블릿, 사무실 PC 간 이어하기 요구에 직접 대응할 수 있다.
- 승인 이력, 팀별 작업본, 백업 중앙화로 제품 신뢰도를 높일 수 있다.

단점:

- 인증, 권한, 충돌 해결, 운영 비용, 데이터 백업 정책을 즉시 결정해야 한다.
- 현재 프론트 document model과 화면 구조가 서버 동기화에 맞게 충분히 분리되어 있지 않다.
- 현장 피드백 전 자체 개선 단계에서 범위가 과도하게 커진다.

판단: V3+ 주요 확장 방향으로 둔다. V3 Core에서는 서버 도입 전제 조건만 준비한다.

### Option C. Frontend Platform And Field Workbench First

프론트 단독 범위 안에서 작업본 구조, 화면 정보구조, 검증 자동화, 성능 guard를 정리한 뒤 서버 확장 여부를 판단하는 접근이다.

장점:

- 현재 제품의 강점을 유지하면서 V3 규모 변경의 리스크를 줄인다.
- 현장 피드백이 오기 전 자체 개선으로 진행하기 적합하다.
- 서버 동기화, 승인 이력, 외부 연동으로 넘어갈 기반을 만든다.

단점:

- 사용자에게 보이는 신규 대형 기능은 서버-first보다 적어 보일 수 있다.
- 구조 분해와 검증 자동화는 단기 체감보다 장기 안정성에 가까운 투자다.

판단: V3 Core의 기본 전략으로 채택한다.

## 5. PM Final Decision

V3는 두 단계로 나눈다.

### 5.1 V3 Core

V3 Core는 프론트엔드 단독 범위를 유지한다. 목표는 다음과 같다.

- 현장 작업자가 반복 업무에서 더 적은 스크롤과 더 명확한 상태로 사용할 수 있는 작업대 구조를 만든다.
- V3+ 서버 동기화에 대비해 작업본과 결과 이력을 document model 중심으로 정리한다.
- 엔진/추가 시뮬레이션의 성능 guard와 실패 이유를 강화한다.
- 브라우저 기반 QA 증거를 자동화해 `문서는 완료인데 구현은 미완료` 문제를 줄인다.

### 5.2 V3+

V3+는 별도 승인 또는 현장 피드백이 들어왔을 때 진행한다.

- 계정, 팀, 권한, 서버 저장소, 여러 기기 자동 동기화
- 작업 승인, 위험 옵션 승인 이력, 작업 변경 이력
- WMS/TMS/ERP 연동
- 무게 중심, 총중량, 층별 하중, 파레트 하중 한계 계산
- 실제 현장 작업 결과와 추천 결과의 차이를 수집하는 운영 데이터 루프

## 6. V3 Core Workstreams

### Phase 0. V3 Baseline And Evidence Currentness

Goal: V2의 마지막 안정 상태를 V3 시작 기준으로 고정한다.

Tasks:

1. 현재 `v2` HEAD 기준 산출물, 검증 명령, 주요 field fixture, 브라우저 acceptance 상태를 정리한다.
2. 검증 문서는 특정 커밋의 증거라는 점을 명확히 표기한다.
3. 현재 HEAD와 evidence 기준이 어긋날 때 `완료`로 오해하지 않도록 문서 문구를 점검한다.
4. V3 작업부터는 제품 동작 변경, 문서 변경, 검증 증거 갱신을 같은 cycle에서 처리하는 기준을 유지한다.

Acceptance Criteria:

- V3 시작 문서에서 `V2 검증 증거는 특정 커밋 기준`이라는 기준이 보인다.
- 새 기능 완료 보고에는 자동 검증 또는 브라우저 증거가 함께 남는다.

### Phase 1. Frontend Structure Decomposition

Goal: V3 기능 확장을 위해 거대한 화면 컴포넌트를 책임 단위로 분리한다.

Tasks:

1. `tetris-workspace-app.tsx`의 상태와 UI를 workspace shell, library shell, review shell, result shell, simulation shell 후보로 분해한다.
2. 순수 유틸과 React state handler의 경계를 정리한다.
3. import, result, storage, simulation 관련 selector/helper를 파일 단위로 분리한다.
4. CSS는 기능 추가 없이 책임 범위별 section comment와 class naming을 정리한다.
5. 분해 중 사용자 화면은 동일하게 유지하고, snapshot/브라우저 smoke로 회귀를 확인한다.

Acceptance Criteria:

- 핵심 화면 흐름은 그대로 유지된다.
- 주요 domain logic은 React component 내부가 아니라 순수 유틸에서 테스트된다.
- UI 변경 없이 구조 분해만 한 커밋은 제품 기능 변경으로 표현하지 않는다.

### Phase 2. Workspace Document Model V3

Goal: 서버 없이도 여러 작업본, 작업 이력, 백업, 결과 snapshot을 더 명확히 관리한다.

Tasks:

1. 현재 단일 workspace를 `작업 목록`, `활성 작업`, `최근 결과 snapshot`, `최근 백업` 개념으로 확장할 수 있는 모델을 설계한다.
2. IndexedDB migration에서 기존 V2 작업본을 안전하게 보정한다.
3. JSON 백업에는 manifest, schema version, app version, createdAt, source device, result history metadata를 분리한다.
4. 백업 가져오기에서 같은 작업본, 복사본, 오래된 백업, schema mismatch를 구분한다.
5. Storage quota와 eviction 가능성을 고려해 백업 리마인더 기준을 개선한다.

Acceptance Criteria:

- 기존 V2 JSON과 IndexedDB 작업본을 V3에서 열 수 있다.
- 작업본의 `이 작업이 무엇인지`, `언제 계산했는지`, `언제 백업했는지`가 데이터 모델에서 분리된다.
- 서버 동기화가 들어와도 같은 document model을 기준으로 확장할 수 있다.

### Phase 3. Field Workbench IA

Goal: 긴 세로 페이지를 반복 업무에 적합한 작업대 구조로 개선한다.

Tasks:

1. 데스크톱 기준 좌측 작업 흐름, 중앙 편집/결과, 우측 요약 패널 구조를 설계한다.
2. 태블릿에서는 요약 패널을 접이식 또는 하단 tray로 전환한다.
3. 저장 박스 200개 이상을 전제로 검색, 그룹, 선택, 수량 입력을 테이블형 작업대로 재정리한다.
4. 실행 전 확인은 blocker, warning, info를 구분하고 CTA를 하나로 명확히 둔다.
5. 결과 화면은 공간 목록, 3D/2D, 범례, 경고, 추천, 추가 시뮬레이션을 한 작업대 안에서 오가게 한다.
6. V2에서 제거한 배치상세/쌓는순서 표는 되살리지 않는다. 필요한 현장 전달 정보는 요약 산출물로 따로 설계한다.

Acceptance Criteria:

- 1280px 데스크톱에서 결과 확인과 추가 시뮬레이션을 위해 페이지 하단으로 긴 스크롤을 반복하지 않는다.
- 768px 태블릿에서 주요 CTA와 입력이 44px 이상 터치 타깃을 유지한다.
- 360px/390px 모바일은 제약형 end-to-end 또는 참고 검토용 중 하나로 명확히 선언된다.

### Phase 4. Additional Simulation And Engine Guardrails

Goal: 추가 박스 시뮬레이션과 적재 엔진의 성능, 안전 검증, 실패 이유를 강화한다.

Tasks:

1. 추가 시뮬레이션의 추천, 선택 순서 우선, 박스별 우선 결과가 같은 invariant 검증을 통과하도록 공통 validation을 정리한다.
2. geometry, overlap, support, utilization, max dimension 계산을 공통 모듈로 분리한다.
3. 수량, 박스 종류, 후보 좌표, permutation 개수에 대한 계산량 추정치를 만든다.
4. 계산 시간이 길어질 가능성이 있으면 실행 전 예상 시간 또는 제한 안내를 표시한다.
5. Worker fallback이 발생하면 사용자에게 계산이 느릴 수 있음을 안내하고 개발 로그에도 남긴다.
6. 추가 시뮬레이션 결과가 `추가 가능 0개`일 때도 실패가 아니라 원인을 설명하는 정상 결과로 표시한다.

Acceptance Criteria:

- 모든 결과 variant가 공간 경계, 충돌, 지지면, fragile, 수량 합계 invariant를 통과한다.
- 대량 입력에서 UI가 멈추지 않거나, 멈출 수 있는 조건을 사전에 안내한다.
- 실패 결과에는 사용자가 이해할 수 있는 원인과 개발자가 추적할 수 있는 reason code가 남는다.

### Phase 5. Browser QA Automation

Goal: 주요 UI/UX 회귀를 실제 브라우저 기준으로 자동 확인한다.

Tasks:

1. Playwright 기반 smoke를 도입할지 검토하고, 도입 시 production build 기준으로 실행한다.
2. 360px, 390px, 768px, 1280px viewport에서 horizontal overflow와 주요 CTA bounding box를 확인한다.
3. 저장 박스 `.xlsx`, 현재 작업 `.xlsx`, 오류 행 미리보기, 중복 처리, 백업 가져오기를 브라우저 시나리오로 검증한다.
4. 결과 생성, 3D canvas non-blank, WebGL fallback, 방향 화살표, 결과 최대치수, 추가 시뮬레이션 선택 순서 변경 feedback을 검증한다.
5. 접근성 smoke로 keyboard tab order, focus visible, aria label, modal focus trap, contrast 후보를 확인한다.
6. 검증 결과는 커밋, 명령, viewport, 스크린샷/로그 경로를 포함해 기록한다.

Acceptance Criteria:

- UI 변경 완료 보고에 실제 브라우저 증거가 포함된다.
- source-level layout guard만으로 UI 변경 완료를 말하지 않는다.
- 모바일/태블릿 지원 수준이 문서와 검증 증거에서 일치한다.

### Phase 6. PWA, Backup, And Recovery Hardening

Goal: 현장 사용자가 브라우저 저장소와 백업의 차이를 더 명확히 이해하고 복구할 수 있게 한다.

Tasks:

1. 저장 상태 패널을 작업본 상태, 백업 상태, 오프라인 준비, 충돌 상태로 명확히 구분한다.
2. JSON 백업에 hash 또는 manifest 검증을 추가할지 검토한다.
3. 백업 파일명과 가져오기 충돌 문구를 작업명/날짜/기기 기준으로 더 명확히 한다.
4. PWA update available 상태를 사용자가 이해할 수 있게 표시한다.
5. 오프라인 재진입은 `데이터 보존 보장`이 아니라 `앱 화면 재진입 보조`임을 유지한다.

Acceptance Criteria:

- 현장 사용자가 자동저장과 백업 파일의 차이를 문구만 보고 구분할 수 있다.
- 가져오기 충돌에서 덮어쓰기, 복사본 열기, 취소의 결과가 명확하다.
- production build에서 오프라인 재진입과 백업 가져오기를 검증한다.

### Phase 7. Field Handoff Summary And Risk Governance

Goal: 결과를 현장에서 설명하고 책임 있게 적용할 수 있는 요약 산출물을 만든다.

Tasks:

1. 결과 요약 산출물에 공간 수, 미적재 수량, 결과 최대치수, 주요 경고, 사용한 공격 옵션을 포함한다.
2. 부분 지지 허용, 오버행 파레트, 안전 여유 변경 추천은 적용 여부와 검토 시각을 남긴다.
3. V2에서 제거한 배치상세/쌓는순서 표는 되살리지 않고, 현장 의사결정에 필요한 요약만 제공한다.
4. 향후 서버 도입 시 승인자, 승인 시각, 변경 이력을 붙일 수 있도록 데이터 필드를 설계한다.

Acceptance Criteria:

- 결과 공유용 요약은 현장 작업자가 읽을 수 있는 언어로 되어 있다.
- 위험 옵션은 자동 적용처럼 보이지 않는다.
- V3+ 서버 승인 이력으로 확장 가능한 구조를 가진다.

## 7. V3+ Expansion Candidates

V3 Core 이후 또는 현장 피드백에 따라 다음 확장을 검토한다.

### 7.1 Server Sync And Team Workspace

- 사용자 계정과 작업 공간
- 팀별 작업본 목록
- 여러 기기 자동 동기화
- 충돌 해결 정책
- 서버 백업과 복원

서버 도입 기준:

- 같은 작업을 PC와 태블릿에서 이어서 해야 한다.
- 여러 사람이 같은 박스 라이브러리와 작업 결과를 공유해야 한다.
- JSON 백업만으로 데이터 보존 요구를 충족하기 어렵다.
- 승인 이력과 책임 추적이 필요하다.

### 7.2 Approval And Audit Trail

- 오버행 파레트 사용 승인
- 부분 지지 허용 사용 승인
- 안전 여유 변경 승인
- 결과 재계산 이력
- 이전 결과와 현재 결과 비교

### 7.3 Weight And Load Model

- 박스 무게 계산 반영
- 파레트 총중량 제한
- 층별 하중 제한
- 무게 중심과 전도 위험
- 깨짐주의보다 세밀한 하중 취약도

주의: 무게 필드를 계산에 반영하기 전에는 현장 하중 기준과 검증 fixture를 먼저 정의해야 한다.

### 7.4 External Integration

- WMS/TMS/ERP의 박스/상품/작업 지시 데이터 import
- CSV 또는 API 기반 자동화
- 계산 결과 export
- 현장 실적 데이터 feedback loop

## 8. Non-Goals For V3 Core

V3 Core에서 하지 않을 일은 다음과 같다.

- 서버 계정과 DB 저장소를 즉시 구현하지 않는다.
- WMS/TMS/ERP 연동을 즉시 구현하지 않는다.
- 무게를 적재 계산에 바로 반영하지 않는다.
- V2에서 제거한 배치상세/쌓는순서 표를 메인 결과 화면에 되살리지 않는다.
- 단순 문구 변경만으로 새로운 엔진 정책이 있는 것처럼 표현하지 않는다.
- 검증 증거 없이 문서에서 완료로 표시하지 않는다.

## 9. Recommended First V3 Implementation Sequence

1. V3 baseline evidence와 문서 기준 정리
2. `tetris-workspace-app.tsx` 책임 분리 계획 작성과 작은 구조 분해
3. 작업본 document model V3 설계
4. 브라우저 QA 자동화 최소 smoke 도입 검토
5. 결과 workbench IA 설계와 목업
6. 추가 시뮬레이션/엔진 guardrail 설계
7. 백업/복구/PWA hardening
8. field handoff summary와 위험 옵션 governance

첫 구현 증분은 UI 대개편보다 구조 분해와 검증 기준을 먼저 잡는 것을 권장한다. 그래야 이후 workbench UI, document model, 서버 동기화 준비를 안전하게 진행할 수 있다.

## 10. Definition Of Done For V3 Work

V3 기능 또는 구조 변경은 다음 기준을 만족해야 완료로 본다.

- product-manager가 범위와 목적을 명확히 정의한다.
- visible UI 변경은 business-analyst, ui-designer, ui-ux-tester 검토를 거친다.
- 계산/저장/백업/엔진 변경은 code-reviewer 관점의 회귀 위험을 먼저 정리한다.
- nextjs-developer는 구현 전에 기존 패턴과 데이터 migration 영향을 확인한다.
- `npm test`, `npx tsc --noEmit`, `npm run build`가 통과한다.
- 엔진이나 현장 주요 흐름 변경은 `npm run field:audit`를 통과한다.
- UI 변경은 필요한 viewport 브라우저 검증을 남긴다.
- 문서에는 구현 완료, 검증 완료, 검토 예정 상태를 구분해서 적는다.

## 11. Reference Notes

- 현재 산출물 기준: [docs/development-deliverables.md](../development-deliverables.md)
- V2 현장 피드백 로드맵: [2026-06-10-v2-field-feedback-roadmap.md](2026-06-10-v2-field-feedback-roadmap.md)
- V2 현장 패치 계획: [2026-06-12-v2-field-patch-plan.md](2026-06-12-v2-field-patch-plan.md)
- 현장 시연 가이드: [docs/field-demo-user-guide.md](../field-demo-user-guide.md)
- Next.js Static Export 공식 문서: [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- IndexedDB 공식 참고: [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- 브라우저 저장소 quota 참고: [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Playwright 접근성 검증 참고: [Playwright Accessibility testing](https://playwright.dev/docs/accessibility-testing)
- Playwright viewport/emulation 참고: [Playwright Emulation](https://playwright.dev/docs/emulation)
- Three.js 대량 mesh 최적화 참고: [three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)

