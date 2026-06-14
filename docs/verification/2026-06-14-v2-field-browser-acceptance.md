# Package Tetris V2 현장 브라우저 acceptance 기록

## 1. 기준

- 작성일: 2026-06-14
- 브랜치: `v2`
- 제품 구현 검증 기준 커밋: `d05ad40`
- 범위: 문서/테스트 전용 변경으로, 런타임 UI와 적재 엔진 변경 없음
- 확인 방법: 인앱 브라우저에서 `http://localhost:3000`을 열고 현재 입력 기준으로 결과를 다시 만든 뒤 360px, 390px, 768px, 1280px 폭을 실측했다.
- 메타데이터: `docs/verification/2026-06-14-v2-field-browser-acceptance.meta.json`

이 기록은 최신 제품 기능을 새로 보증한다는 선언이 아니라, `d05ad40` 구현 상태에서 현장 시연에 필요한 브라우저 화면 기준을 실제 확인한 근거다. 이후 런타임 UI, 3D 결과 뷰어, 카드/모달/표, CTA, WebGL fallback, 저장/백업 UI가 바뀌면 같은 폭으로 다시 실측한다.

## 2. 역할별 판단

### Product Manager

- 이번 증분은 새 기능 개발이 아니라, V2 검증 기준을 브라우저 실측 기록과 문서 테스트로 잠그는 작업이다.
- 최근 `3D 방향 화살표`처럼 문서와 구현이 어긋난 이슈가 있었으므로, 실제 확인 항목과 기준 커밋을 함께 남긴다.

### Business Analyst

- 현장 작업자는 결과 화면에서 숫자와 3D를 같이 확인한다.
- 문구는 개발자 용어보다 `결과 최대치수`, `가로/세로/높이`, `백업 파일 만들기`, `선택 해제`, `부분 지지 허용`처럼 바로 행동을 이해할 수 있는 말을 사용한다.

### UI Designer

- `결과 최대치수`는 캔버스를 덮는 별도 큰 카드가 아니라 compact chip bar로 유지한다.
- `깊이` 표현 대신 `가로/세로/높이`로 표기한다.

### UI/UX Tester

- 360px, 390px, 768px, 1280px에서 horizontal overflow가 없어야 한다.
- 주요 CTA는 최소 44px, 모바일 핵심 CTA는 48px 높이를 기준으로 본다.
- 3D는 자유 제스처만 의존하지 않고 `3D`, `위`, `앞`, `옆`, `처음`, `크게 보기` 버튼을 제공해야 한다.

### Code Reviewer

- 브라우저 acceptance 문서는 기존 검증 리포트와 같은 방식으로 기준 커밋, 변경 범위, 실측 메타데이터를 분리해 드리프트를 줄인다.
- 문서 테스트가 새 acceptance 파일과 메타데이터를 읽어, 다음 사이클에서 기록 누락을 발견하게 한다.

## 3. 화면 폭별 실측 결과

| 폭 | 용도 | horizontal overflow | 주요 CTA | 3D 캔버스 | 결과 최대치수 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| 360px | 모바일 제약형 end-to-end | 없음, scrollWidth 345px | 백업/추천 계산/다시 계산 CTA 48px | 223 x 262px, non-white 20,250px | 가로/세로/높이 표시 | 통과 |
| 390px | 실제 휴대폰 폭 | 없음, scrollWidth 375px | 백업/추천 계산/다시 계산 CTA 48px | 253 x 262px, non-white 21,917px | 가로/세로/높이 표시 | 통과 |
| 768px | 태블릿 주 사용 폭 | 없음, scrollWidth 753px | 주요 CTA 44px 이상 | 408 x 447px, non-white 43,363px | 가로/세로/높이 표시 | 통과 |
| 1280px | PC 시연 폭 | 없음, scrollWidth 1265px | 주요 CTA 44px 이상 | 651 x 398px, non-white 18,295px | 가로/세로/높이 표시 | 통과 |

확인한 공통 항목:

- `3D`, `위`, `앞`, `옆`, `처음`, `크게 보기` 버튼이 네 폭 모두에서 존재한다.
- 3D 캔버스는 스크린샷 기준으로 비어 있지 않음 상태다.
- `결과 최대치수`는 `가로/세로/높이` 순서로 표시된다.
- `깊이` 표현은 결과 최대치수에 노출되지 않는다.
- `백업 파일 만들기` CTA가 결과 흐름 안에 남아 있다.
- WebGL fallback 역할을 하는 2D 보기 버튼인 `위 보기`, `앞 보기`, `옆 보기`가 유지된다.

레거시 결과 산출물 상태:

이 표는 기존 브라우저 결과 화면 실측과 source-level 제거 가드 `src/lib/workspace/result-detail-removal-layout.test.ts`를 함께 근거로 한다. 버튼, 모달, 복사, 다운로드 진입점이 다시 생기면 해당 가드와 이 acceptance 테스트 중 하나가 먼저 실패해야 한다.

| 항목 | 화면 상태 | 파일/복사 산출물 |
| --- | --- | --- |
| 배치 상세 | 미노출 | export 없음 |
| 쌓는 순서 | 미노출 | export 없음 |
| 작업지시서 | 미노출 | export 없음 |

3D 해석성 source-level 가드:

`결과 최대치수`, `방향 화살표`, `3D 클릭 강조 제거`는 현장 작업자가 3D를 보고 실제 적재 방향과 오버 여부를 판단하는 기준이다. 이 항목은 문서에만 완료라고 적지 않고, 아래 source-level 가드가 실제 소스 계약을 함께 확인한다. 특히 방향 화살표는 선분형 helper 방식으로 되돌아가면 실패해야 한다.

| 항목 | 확인 기준 | 가드 |
| --- | --- | --- |
| 결과 최대치수 | 공간 원래 치수가 아니라 현재 결과의 최대 가로/세로/높이를 표시하고, 오버레이가 캔버스 조작을 막지 않음 | `src/lib/workspace/result-3d-dimension-overlay-layout.test.ts` |
| 방향 화살표 | 처음 입력한 높이 방향을 납작한 면형 mesh로 표시하고, 박스 선택 raycast 대상에서 제외함 | `src/lib/workspace/result-3d-orientation-arrow-layout.test.ts` |
| 클릭 강조 제거 | 3D 캔버스 클릭은 강조 상태를 만들지 않고, 강조는 범례/2D 보기와 강조 해제 버튼으로 제어함 | `src/lib/workspace/result-selection-clear-action-layout.test.ts` |

결과 KPI source-level 가드:

아래 항목은 새 브라우저 실측이 아니라 기존 source-level 가드로 유지 중인 결과 해석 기준이다. 결과 요약 타일이나 상태 문구 UI가 바뀌면 다음 브라우저 acceptance 재실측 대상에 포함한다.

| 항목 | 의미 | 현장 판단 | 가드 |
| --- | --- | --- | --- |
| 평균 적재율 | 사용된 적재공간별 적재율 평균 | 공간별 적재 효율이 전반적으로 낮은지 빠르게 판단 | `src/lib/workspace/result-remaining-volume-layout.test.ts` |
| 남은 부피 | 현재 결과 기준으로 사용할 수 있게 남은 총 부피 | 추가 박스를 더 시험할 여지가 있는지 판단 | `src/lib/workspace/result-remaining-volume-layout.test.ts` |
| 미적재 | 현재 결과에서 적재하지 못한 박스 수량 | 수량 조정, 공간 변경, 오버행 검토 필요 여부 판단 | `src/lib/workspace/result-warning-summary.test.ts` |
| 계산 시각 | 현재 결과가 생성된 시각 | 보고 있는 결과가 최신 계산인지 확인 | `src/lib/workspace/result-calculated-time-layout.test.ts` |

상태 전이 source-level 가드:

`계산 실패`는 복구가 필요한 경고 배너로 보고, `추가 가능 0`은 실패가 아니라 결과 맥락 안의 안내 상태로 본다. 두 상태가 같은 오류처럼 보이면 현장 작업자가 입력 문제와 단순 추가 불가 결과를 혼동할 수 있다. 또한 `결과 백업 권장`과 `오프라인 백업 권장`은 분리한다. 전자는 생성된 결과를 다른 기기/시연 PC로 옮기기 위한 안내이고, 후자는 인터넷 끊김 상태에서 현재 작업을 잃지 않기 위한 안내다.

| 상태 | 시작 상태 | 트리거 | 도착 상태 | 다음 행동 | 유지/취소 정책 | 가드 |
| --- | --- | --- | --- | --- | --- | --- |
| 미적재 확인 | 결과 생성 완료 | 미적재 박스가 1개 이상 남음 | 결과 확인 유지 | 작업 수량 조정 또는 더 큰 공간 선택 | 현재 결과와 미적재 요약 유지 | `src/lib/workspace/result-warning-summary.test.ts` |
| 결과 백업 권장 | 결과 생성 완료 | 최신 결과가 아직 백업되지 않음 | 결과 확인 유지 | 백업 파일 만들기 | 현재 결과와 작업 데이터 유지 | `src/lib/workspace/result-backup-action-layout.test.ts` |
| 오프라인 백업 권장 | 작업 중 | 인터넷 끊김 감지 및 작업 데이터 존재 | 작업 중 유지 | 현재 작업 백업 만들기 | 브라우저 저장 상태를 유지하고 백업 안내 | `src/lib/workspace/connectivity-status.test.ts` |
| 결과 생성 중 | 실행 전 확인 | 결과 만들기 클릭 | 계산 진행 | 계산 완료까지 대기 | 중복 계산 CTA 비활성 | `src/lib/workspace/result-calculation-feedback-layout.test.ts` |
| 메인 결과 계산 실패 | 계산 진행 | 적재 계산 예외 발생 | 복구 필요 | 입력 수정 또는 다시 계산 | 실패 원인을 경고 배너에 유지 | `src/lib/workspace/result-calculation-failure-layout.test.ts` |
| 추가 시뮬레이션 계산 실패 | 추가 시뮬레이션 계산 중 | 추가 결과 계산 예외 또는 fatal warning | 추가 시뮬레이션 복구 필요 | 기준 결과 다시 생성 또는 선택 초기화 | 선택한 추가 박스 조건은 사용자가 복구 행동을 선택할 때까지 유지 | `src/lib/workspace/multi-chain-simulation-layout.test.ts` |
| 추가 가능 0 | 추가 시뮬레이션 계산 완료 | 선택 조건에서 추가 가능한 박스가 없음 | 결과 안내 | 다른 박스 선택 또는 선택 초기화 | 계산 실패가 아닌 안내 상태로 유지 | `src/lib/workspace/multi-chain-simulation-layout.test.ts` |
| 미리보기 취소 | 추가 결과 미리보기 | 미리보기 취소 클릭 | 추가 시뮬레이션 조건 설정 | 조건 유지 후 다시 계산 | 선택 박스와 수량 조건 유지 | `src/lib/workspace/multi-chain-simulation-layout.test.ts` |
| 직전 추가 취소 | 추가 결과 반영 완료 | 직전 추가 취소 클릭 | 직전 반영 이전 결과 | 필요 시 추가 조건 재계산 | 반영된 추가 결과만 되돌림 | `src/lib/workspace/multi-chain-simulation-layout.test.ts` |
| 다른 탭 저장 충돌 | 작업 중 | 다른 탭 또는 창에서 최신 작업본 저장 | 읽기 전용 충돌 보호 | 최신본 불러오기 또는 현재 화면 백업 | 덮어쓰기 방지를 위해 편집 CTA 차단 | `src/lib/workspace/save-conflict-banner-layout.test.ts` |
| WebGL 실패 2D 보기 | 3D 결과 확인 | WebGL 렌더러 초기화 실패 | 2D 투영 확인 | 위 보기로 확인 | 결과 데이터는 유지하고 2D 보기로 대체 | `src/lib/workspace/webgl-fallback-action-layout.test.ts` |
| 백업 가져오기 충돌 | 백업 파일 가져오기 | 현재 작업과 가져오기 파일이 충돌 | 가져오기 결정 대기 | 현재 작업 유지, 가져온 파일로 교체, 복사본 열기 또는 가져오기 취소 | 사용자가 결정하기 전 현재 작업 유지 | `src/lib/workspace/import-conflict-panel-layout.test.ts` |

## 4. 추가 박스 시뮬레이션 상태 확인

- 결과 하단에 `5. 추가 박스 시뮬레이션`이 노출된다.
- 추가 박스 설명은 선택 순서가 우선순위임을 안내한다.
- 추가 박스 1개 선택 시 `1순위` 배지가 노출된다.
- 선택 카드의 `선택 해제` 버튼은 104 x 48px로 확인됐다.
- 선택 또는 해제 뒤에는 기존 미리보기를 그대로 쓰지 않고 다시 계산하도록 안내한다.

## 5. 적재 정책과 대표 회귀 기준

- `부분 지지 허용`은 받침면 55% 기준 설명과 함께 노출된다.
- V2 바람개비 검증 항목은 690 x 370 x 580mm 박스 8개 기본 파레트 회귀 케이스를 유지한다. 현장 설명에는 `엇갈림 배치`를 함께 사용한다.
- 추가 박스 시뮬레이션도 같은 정책 기준을 사용한다.

## 6. 브라우저 검증 재실행 기준

다음 항목이 바뀌면 이 acceptance 기록을 그대로 재사용하지 않는다.

- `src/components` 또는 `src/app/globals.css`의 화면 구조 변경
- 3D 결과 뷰어, 방향 화살표, 결과 최대치수, WebGL fallback 변경
- 버튼, 카드, 모달, 표, 요약 타일, 추가 박스 선택 카드 변경
- 저장/백업/가져오기/충돌 UI 변경
- 적재 엔진 결과가 화면에 표시되는 방식 변경

문서/테스트 전용 변경만 있는 경우에는 `npm run v2:verify` 통과와 문서 테스트로 충분하다.
