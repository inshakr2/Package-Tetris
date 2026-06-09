# Package Tetris V2 Field Feedback Roadmap

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each V2 phase task-by-task.

**Goal:** 현장 사용자 피드백을 V2 범위로 분리하고, `v2` 브랜치에서 기능 확장과 엔진 정책 변경을 안정적으로 진행한다.

**Architecture:** V1은 현장 테스트용 안정 버전으로 동결한다. V2는 프론트 단독 구조를 유지하되, 박스 라이브러리 스키마, 적재 정책, 결과 3D 표현, 추가박스 시뮬레이션을 단계적으로 확장한다. 모든 계산 정책 변경은 적재 엔진, 결과 검증, 추가 시뮬레이션에서 같은 정책 객체를 공유해야 한다.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Three.js client-only renderer, IndexedDB workspace persistence, JSON backup, Node test runner, `.xlsx` browser file import.

---

## 1. Product Manager Scope Decision

### 1.1 V1 동결

- V1은 현장 작업자가 `main` 브랜치 기준으로 테스트하는 버전이다.
- 현장 피드백 기반의 추가 기능 개발은 V1에 넣지 않는다.
- V1에서 아직 처리하지 못한 후보 기능도 모두 V2 backlog로 이동한다.
- V1에는 치명적인 실행 불가, 데이터 손실, 빌드 실패, 보안성 문제만 hotfix로 반영한다.

### 1.2 V2 브랜치 운영

- V2 작업 기준 브랜치: `v2`
- `main`은 현장 테스트 안정 브랜치로 유지한다.
- V2 안정화 후 병합 방향: `v2 -> main`
- 각 기능 증분은 가능한 작은 커밋으로 나누고, 검증이 끝난 변경만 원격 `v2`에 push한다.
- V2 기능 개발 중 main의 hotfix가 발생하면 `main -> v2`로 먼저 반영해 테스트 기준을 맞춘다.

### 1.3 V2 우선순위 원칙

1. 계산 정합성: 공간 경계, 충돌, 지지면, 깨짐주의 정책이 깨지면 기능 완료로 보지 않는다.
2. 현장 사용성: IT 비전문 사용자가 태블릿 또는 PC에서 검색, 선택, 계산, 확인까지 수행해야 한다.
3. 대량 데이터 대응: 저장 박스 200개 수준에서도 검색, 그룹, 일괄등록이 사용 가능해야 한다.
4. 단계적 안정화: 데이터 스키마 변경과 엔진 정책 변경은 UI보다 먼저 테스트로 고정한다.

## 2. Confirmed Decisions

| 항목 | 확정 결정 |
| --- | --- |
| 부분 지지 기능 명칭 | `부분 지지 허용`을 사용한다. |
| 지지면 비율 표기 | `55%`는 버튼/체크박스 이름에 직접 붙이지 않고 설명 문구, 상태 문구, 검증 결과에 별도 표기한다. |
| 배치상세 / 쌓는순서 | 메인 결과 화면에서 제거한다. 작업지시서와 내부 데이터 산출물에서도 삭제한다. |
| 배치상세 / 쌓는순서 삭제 범위 | 3D 렌더링과 안전 검증에 필요한 `PackedBlock` 좌표 데이터는 유지한다. 단, 배치 상세표, 쌓는 순서표, 텍스트 다운로드/복사/모달 산출물은 제거 대상이다. |
| 일괄등록 범위 | `.xlsx` 업로드까지만 V2 목표로 잡는다. CSV 우선 구현은 하지 않는다. |
| V1 추가 개발 | 하지 않는다. 모든 현장 피드백 반영은 V2에서 진행한다. |

## 3. Field Feedback Coverage Check

| 원문 항목 | V2 반영 계획 | 누락 여부 | 비고 |
| --- | --- | --- | --- |
| 1-1 기본 파레트 `1100*1100*1550`, 오버행 파레트 `1150*1150*1550`, 안전 여유 0 | Phase 2에서 preset 추가/수정 | 없음 | 기존 `preset-pallet-1150` 호환성 처리 필요 |
| 1-2 안전여유를 초과하면 오버행 파레트 전향 알림 | Phase 2에서 오버행 추천 계산 | 없음 | 자동 변경하지 않고 추천/미리보기 |
| 2-1 박스 등록에 무게 추가, 필수 아님 | Phase 3에서 `weightKg` optional 추가 | 없음 | 적재 계산에는 우선 미반영 |
| 2-1 기본 수량 데이터 삭제 | Phase 3에서 템플릿 기본 수량 제거 | 없음 | 현재 작업 수량 입력은 유지 |
| 2-2 TextBox 클릭 시 기본 글자 삭제 | Phase 3에서 placeholder/select-on-focus 정책 적용 | 없음 | 사용자 입력값은 임의 삭제하지 않음 |
| 2-3 저장 박스 200개 검색/그룹화 | Phase 3에서 검색/상위그룹/하위그룹 필터 | 없음 | 그룹은 2단계 고정으로 시작 |
| 2-3 상위그룹/하위그룹 | Phase 3에서 `group1`, `group2` 도입 | 없음 | 예: `금영 -> 스피커` |
| 2-3 엑셀 시트 일괄 등록 | Phase 4에서 `.xlsx` import | 없음 | 업로드 전 미리보기/오류 행 표시 |
| 3-1 원하는 화물을 아래층 우선 적재 | Phase 5에서 작업 단위 `loadPriority` 추가 | 없음 | 템플릿 전역값이 아니라 이번 작업 기준 |
| 4-1 배치상세/쌓는순서 불필요 | Phase 6에서 UI/산출물 제거 | 없음 | 기존 테스트/문서도 정리 |
| 4-2 제품 방향 화살표 | Phase 6에서 3D 방향 표시 | 없음 | 원래 입력 높이 방향을 기준으로 표시 |
| 4-2 100% 지지면 조건을 55%까지 허용 | Phase 5에서 `부분 지지 허용` 정책 추가 | 없음 | 기본 OFF, 실행 전 확인에서 선택 |
| 4-2 추가 시뮬레이션에도 동일 적용 | Phase 7에서 multi simulation에 정책 전달 | 없음 | 기존 chain validation도 같은 정책 사용 |
| 5 추가박스 시뮬레이션을 5단계로 구성 | Phase 7에서 단계 분리 | 없음 | 결과 후속 단계로 노출 |
| 5-1 현재 공간 제품 외 제품 선택 | Phase 7에서 저장 박스 전체 검색/그룹 선택 | 없음 | Phase 3의 라이브러리 UI 재사용 |
| 5-2 최대 3개 선택 | Phase 7에서 선택 제한 | 없음 | 4개 이상 선택 시 안내 |
| 5-3 현재 적재 상태 기반 최적화 | Phase 7에서 base result locked simulation | 없음 | 남는 부피 최소화를 추천 결과로 정의 |
| 5-4 최적화/A우선/B우선 결과 | Phase 7에서 variant result 모델 | 없음 | 선택 박스 수에 따라 우선 결과 생성 |

## 4. V2 Data Model Plan

### 4.1 Workspace Schema

V2는 `WORKSPACE_SCHEMA_VERSION`을 올린다. 기존 V1 IndexedDB와 JSON 백업 파일은 V2 로드 시 자동 보정한다.

```ts
export const WORKSPACE_SCHEMA_VERSION = 2;
```

### 4.2 Block Template

박스 템플릿은 저장 라이브러리의 재사용 단위다. 수량과 적재 우선순위는 작업마다 달라질 수 있으므로 템플릿에 저장하지 않는다.

```ts
interface BlockTemplate {
  blockTemplateId: string;
  entityVersion: number;
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
  weightKg?: number | null;
  group1?: string;
  group2?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.3 Draft Block Item

현재 작업에 추가된 박스 단위다. 수량과 하단 우선순위는 여기서 관리한다.

```ts
interface DraftBlockItem {
  draftBlockItemId: string;
  blockTemplateId: string;
  quantity: number;
  loadPriority?: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### 4.4 Block Definition

엔진 입력에는 템플릿 정보와 작업 단위 정책을 합친다.

```ts
interface BlockDefinition {
  blockId: string;
  blockTemplateId: string;
  draftBlockItemId: string;
  entityVersion: number;
  name: string;
  dimensions: Dimensions;
  quantity: number;
  fragile: boolean;
  weightKg?: number | null;
  group1?: string;
  group2?: string;
  loadPriority?: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### 4.5 Placement Policy

`부분 지지 허용`은 모든 적재 계산과 검증에서 공유한다.

```ts
interface PlacementPolicy {
  fragileStackOnFragileAllowed: boolean;
  nonFragileOnFragileAllowed: boolean;
  partialSupportEnabled: boolean;
  minimumSupportRatio: number; // default 1, partial support mode 0.55
}
```

UI 문구는 `부분 지지 허용`을 사용하고, 설명에 `받침면 55% 이상이면 적재 가능으로 계산`을 표시한다.

## 5. V2 Phase Plan

### Phase 1. V2 기준 문서와 스키마 마이그레이션 준비

**Goal:** V2 작업 기준을 문서화하고 V1 데이터가 V2에서 깨지지 않도록 migration 설계를 고정한다.

**Files:**
- Modify: `src/lib/workspace/types.ts`
- Modify: `src/lib/workspace/workspace-factory.ts`
- Modify: `src/lib/persistence/json-transfer.ts`
- Modify: `src/lib/persistence/json-transfer.test.ts`
- Modify: `src/lib/persistence/indexed-db.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`

**Tasks:**
1. `WORKSPACE_SCHEMA_VERSION`을 2로 올리는 실패 테스트를 먼저 작성한다.
2. V1 JSON import가 V2 workspace로 보정되는 테스트를 작성한다.
3. V1 IndexedDB record load 후 `normalizeWorkspace`가 V2 필드를 채우는 테스트를 작성한다.
4. 신규 필드 기본값을 정의한다.
5. `npm test`, `npx tsc --noEmit`, `npm run build`를 실행한다.

**Acceptance Criteria:**
- V1 백업 JSON을 V2에서 가져올 수 있다.
- V1 IndexedDB 작업본을 V2에서 열 수 있다.
- 신규 필드는 없거나 null이어도 화면과 엔진이 실패하지 않는다.

### Phase 2. 파레트 preset과 오버행 추천

**Goal:** 현장 기준 파레트 공간을 기본 제공하고, 기본 파레트에서 아쉽게 공간이 늘어나는 경우 오버행 파레트를 검토하도록 추천한다.

**Files:**
- Modify: `src/lib/workspace/presets.ts`
- Modify: `src/lib/workspace/workspace-factory.ts`
- Modify: `src/lib/workspace/result-offset-recommendation.ts`
- Modify: `src/lib/workspace/result-offset-recommendation.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `docs/tetris-ui-planning-draft.md`

**Tasks:**
1. `기본 파레트` preset 테스트를 작성한다: `1100 x 1100 x 1550`, offset `0`.
2. `오버행 파레트` preset 테스트를 작성한다: `1150 x 1150 x 1550`, offset `0`.
3. 기존 `preset-pallet-1150` 저장 호환성 처리 방식을 테스트로 고정한다.
4. 기본 파레트 결과가 오버행 파레트에서 공간 수 감소 또는 미적재 감소로 개선되는 케이스를 테스트한다.
5. 결과 화면에 `오버행 파레트 검토` 추천 카드를 추가한다.

**Acceptance Criteria:**
- 신규 작업의 기본 선택 공간은 `기본 파레트`다.
- 오버행 추천은 자동 적용되지 않는다.
- 추천에는 현재 공간 수, 오버행 검토 시 공간 수, 현장 확인 안내가 표시된다.

### Phase 3. 박스 라이브러리 V2

**Goal:** 저장 박스가 약 200개까지 늘어나도 검색, 그룹 필터, 재사용이 가능하게 한다.

**Files:**
- Modify: `src/lib/workspace/types.ts`
- Modify: `src/lib/workspace/block-library.ts`
- Modify: `src/lib/workspace/block-library.test.ts`
- Modify: `src/lib/workspace/block-library-search-layout.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`

**Tasks:**
1. `BlockTemplate`의 `weightKg`, `group1`, `group2` 저장/수정 테스트를 작성한다.
2. 템플릿 생성 form에서 `기본 수량`을 제거한다.
3. 수량은 `이번 작업에 추가` 액션에서만 입력하도록 분리한다.
4. 텍스트/숫자 입력의 기본값을 placeholder 또는 focus select 방식으로 바꾼다.
5. 검색 대상에 이름, 치수, 깨짐주의, 무게, 상위그룹, 하위그룹을 포함한다.
6. 라이브러리 상단에 상위그룹/하위그룹 필터를 추가한다.
7. 360px, 390px에서 필터와 카드가 가로 넘치지 않도록 layout test를 추가한다.

**Acceptance Criteria:**
- 박스 저장 시 무게는 비워 둘 수 있다.
- 신규 박스 등록 화면에 기본 수량 필드가 없다.
- 저장 박스 200개 기준으로 검색/필터 후 원하는 박스를 찾을 수 있다.
- 사용자가 입력하려고 할 때 예시 문구를 직접 지우지 않아도 된다.

### Phase 4. `.xlsx` 일괄등록

**Goal:** 현장 사용자가 엑셀 파일로 대량 박스 데이터를 가져올 수 있게 한다.

**Files:**
- Create: `src/lib/workspace/block-template-xlsx-import.ts`
- Create: `src/lib/workspace/block-template-xlsx-import.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/field-demo-user-guide.md`

**Tasks:**
1. 사용할 `.xlsx` parser 라이브러리를 고정 버전으로 추가한다.
2. 템플릿 컬럼을 확정한다: `상위그룹`, `하위그룹`, `박스명`, `가로mm`, `세로mm`, `높이mm`, `무게kg`, `깨짐주의`.
3. `.xlsx` 첫 번째 sheet를 읽어 import 후보로 변환하는 실패 테스트를 작성한다.
4. 필수값 누락, 숫자 오류, 중복 박스명, 음수/0 치수 오류 테스트를 작성한다.
5. 업로드 후 즉시 저장하지 않고 `미리보기 -> 오류 확인 -> 가져오기` 흐름으로 구현한다.
6. 가져오기 결과에 성공 건수, 실패 행, 중복 처리 결과를 표시한다.

**Acceptance Criteria:**
- `.xlsx` 파일만 선택 가능하다.
- 오류가 있는 행은 저장하지 않고 행 번호와 사유를 보여준다.
- 정상 행만 가져오기 또는 전체 취소가 가능하다.
- 가져온 박스는 그룹/검색에서 바로 찾을 수 있다.

### Phase 5. 실행 전 확인 V2: 우선순위와 부분 지지 허용

**Goal:** 현장 작업자가 아래층 우선 적재와 55% 받침면 정책을 명시적으로 선택할 수 있게 한다.

**Files:**
- Modify: `src/lib/workspace/types.ts`
- Modify: `src/lib/workspace/review-gate.ts`
- Modify: `src/lib/workspace/review-gate.test.ts`
- Modify: `src/lib/workspace/packing-placement.ts`
- Modify: `src/lib/workspace/packing-engine.ts`
- Modify: `src/lib/workspace/packing-output-safety.ts`
- Modify: `src/lib/workspace/packed-result-validation.ts`
- Modify: `src/lib/workspace/chain-simulation.ts`
- Modify: `src/lib/workspace/packing-engine.test.ts`
- Modify: `src/lib/workspace/packed-result-validation.test.ts`
- Modify: `src/lib/workspace/chain-simulation.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`

**Tasks:**
1. `loadPriority`가 높은 박스를 먼저 배치하는 실패 테스트를 작성한다.
2. 같은 우선순위 안에서는 기존 결정론적 정렬이 유지되는 테스트를 작성한다.
3. `부분 지지 허용` OFF에서 기존 100% 지지면 규칙이 유지되는 테스트를 작성한다.
4. `부분 지지 허용` ON에서 받침면 55% 이상이면 배치되는 테스트를 작성한다.
5. 받침면 50% 또는 54.9%는 배치되지 않는 테스트를 작성한다.
6. 깨짐주의 정책이 부분 지지 모드에서도 유지되는 테스트를 작성한다.
7. 실행 전 확인에 `부분 지지 허용` 체크박스와 55% 설명 문구를 추가한다.
8. 추가 시뮬레이션도 같은 policy를 받도록 구조를 확장한다.

**Acceptance Criteria:**
- 사용자가 지정한 우선순위 박스가 가능한 한 먼저 낮은 층에 배치된다.
- 부분 지지 옵션은 기본 OFF다.
- 옵션 ON 시 55% 이상 받침면만 허용된다.
- 3D 결과에 공중 배치, 충돌, 공간 경계 초과가 없다.

### Phase 6. 결과 확인 V2: 불필요 상세 삭제와 방향 화살표

**Goal:** 결과 화면 시인성을 높이고, 3D에서 박스가 어느 방향으로 눕거나 세워졌는지 바로 알 수 있게 한다.

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/components/result-stage/result-3d-canvas.client.tsx`
- Modify: `src/lib/workspace/packing-scene.ts`
- Modify: `src/lib/workspace/packing-scene.test.ts`
- Delete or retire: `src/lib/workspace/placement-detail-table.ts`
- Delete or retire: `src/lib/workspace/stacking-layer-summary.ts`
- Modify related tests/docs that reference placement detail or stacking order

**Tasks:**
1. `배치상세` 버튼 제거 layout test를 작성한다.
2. `쌓는순서` 버튼 제거 layout test를 작성한다.
3. 작업지시서/텍스트 다운로드에서 배치 상세표와 쌓는 순서 산출물을 제거한다.
4. `PackedBlock.rotation` 기준으로 원래 높이 축 방향을 계산하는 유틸 테스트를 작성한다.
5. 3D 박스에 방향 화살표를 렌더링한다.
6. `방향 표시` 토글을 추가해 복잡한 결과에서 화살표를 숨길 수 있게 한다.
7. WebGL fallback 상태에서 방향 화살표가 없어도 결과 확인이 가능한 문구를 유지한다.

**Acceptance Criteria:**
- 메인 결과 화면에 `배치상세`, `쌓는순서` 액션이 없다.
- 관련 작업지시서/내부 산출물에도 해당 데이터가 없다.
- 각 박스는 원래 입력 기준 위쪽 방향을 화살표로 보여준다.
- 화살표는 박스 선택, 공간 전환, 카메라 조작을 막지 않는다.

### Phase 7. 추가박스 시뮬레이션 V2

**Goal:** 결과 후속 5단계에서 최대 3개 박스를 선택해 추천 결과와 각 박스 우선 결과를 비교한다.

**Files:**
- Create: `src/lib/workspace/multi-chain-simulation.ts`
- Create: `src/lib/workspace/multi-chain-simulation.test.ts`
- Modify: `src/lib/workspace/chain-simulation.ts`
- Modify: `src/lib/workspace/chain-comparison-view.ts`
- Modify: `src/lib/workspace/types.ts`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/tetris-ui-planning-draft.md`
- Modify: `docs/field-demo-user-guide.md`

**Tasks:**
1. 추가 시뮬레이션 입력 모델을 정의한다: base result, selected templates max 3, policy, runId.
2. 현재 작업에 없는 저장 박스도 선택 가능한 검색/그룹 UI를 재사용한다.
3. 4개 이상 선택 시 선택 제한 안내를 추가한다.
4. `추천 결과` variant 테스트를 작성한다: 남은 부피가 가장 적은 결과를 선택한다.
5. `A 우선`, `B 우선`, `C 우선` variant 테스트를 작성한다.
6. 각 variant가 기존 적재 상태를 잠그고 추가 박스만 배치하는지 테스트한다.
7. 부분 지지 policy와 깨짐주의 policy가 variant 계산에 동일하게 적용되는지 테스트한다.
8. 결과 화면에서 variant 탭 또는 segmented control을 제공한다.
9. `이 결과 반영`과 `되돌리기` 동작을 variant 기준으로 정리한다.

**Acceptance Criteria:**
- 추가박스 시뮬레이션은 결과 확인 이후 5단계로 보인다.
- 저장된 박스 전체에서 최대 3개까지 선택할 수 있다.
- 추천 결과와 각 박스 우선 결과를 비교할 수 있다.
- 적용 전후가 명확하고, 되돌리기가 가능하다.
- 기존 배치 좌표는 잠긴 상태로 유지된다.

## 6. Role Feedback

### 6.1 Business Analyst Feedback

- V2 분리는 타당하다. 현장 테스트 중인 V1에 대규모 변경을 넣으면 테스트 기준이 흔들린다.
- `기본 파레트`와 `오버행 파레트`는 현장 언어와 맞다.
- `무게`는 입력받되 V2 초반 계산에는 반영하지 않는 것이 맞다. 하중/무게중심은 별도 물리 모델이 필요하므로 후속 V2.x로 분리한다.
- `부분 지지 허용`은 현장 판단이 필요한 공격 적재 옵션이므로 기본 OFF와 설명 문구가 필요하다.

### 6.2 UI Designer Feedback

- 4단계 기본 흐름은 유지하고, 추가박스 시뮬레이션은 결과 이후 5단계로 명확히 분리한다.
- 저장 박스 200개 수준에서는 카드 나열보다 검색, 그룹 필터, 선택 상태 고정 영역이 중요하다.
- `.xlsx` 가져오기는 파일 선택 즉시 저장하지 않고 미리보기 화면을 둬야 한다.
- 결과 화면은 3D, 공간 목록, 핵심 요약 중심으로 단순화한다. `배치상세`, `쌓는순서`는 삭제한다.

### 6.3 UI/UX Tester Feedback

- 360px, 390px 모바일에서 그룹 필터와 검색 입력이 1열로 접혀야 한다.
- `.xlsx` 오류 행은 색상만으로 구분하지 말고 행 번호와 사유 텍스트를 제공해야 한다.
- `부분 지지 허용`은 체크 여부, 55% 기준, 책임자 확인 필요성을 같은 영역에서 읽을 수 있어야 한다.
- 추가박스 시뮬레이션 variant는 버튼이 추가됐는지 눈에 잘 보여야 하며, 현재 보고 있는 variant가 명확해야 한다.

### 6.4 Next.js Developer Feedback

- `.xlsx` import 라이브러리는 static export와 browser runtime에서 동작하는지 먼저 검증해야 한다.
- schema migration을 먼저 끝내야 이후 박스 그룹, 무게, 우선순위 작업이 안전하다.
- `partialSupportEnabled`는 `review-gate -> engine-contract -> packing-engine -> safety-gate -> chain`까지 한 번에 전달해야 한다.
- 3D 방향 화살표는 `PackedBlock.rotation`만으로 계산 가능하지만, 테스트 가능한 순수 유틸로 분리해야 한다.

### 6.5 Code Reviewer Feedback

- `배치상세/쌓는순서` 삭제는 UI 제거만으로 끝내면 안 된다. 관련 텍스트 다운로드, 모달, 테스트, 문서 참조까지 제거해야 한다.
- 부분 지지 면적 계산은 기존 non-overlap packing 결과에서는 단순 합산이 가능하다. 다만 외부 import/복원 데이터 검증에서는 중복 면적 double count 가능성을 점검해야 한다.
- `.xlsx` import는 비신뢰 입력이므로 prototype pollution 방지, 컬럼 검증, 숫자 정규화, 빈 행 처리 테스트가 필요하다.
- 추가 시뮬레이션 variant는 계산량이 커질 수 있으므로 선택 박스 3개 제한과 계산 상한을 둬야 한다.

## 7. Verification Standard

Every V2 phase must pass:

```bash
npm test
npx tsc --noEmit
npm run build
```

UI phases must additionally verify:

- 360px mobile
- 390px mobile
- 768px tablet
- 1280px desktop
- No horizontal overflow
- Main controls at least 44-48px touch target
- 3D canvas nonblank after result calculation
- WebGL fallback remains usable

Engine phases must additionally verify:

- No block outside space bounds
- No 3D overlap
- No unsupported floating block
- Fragile stacking policy preserved
- Partial support ratio is consistently applied
- Additional simulation uses the same validation gate

## 8. Open Risks And Follow-Up Decisions

### 8.1 Weight Handling

V2 captures `무게` as optional metadata. It does not affect placement until a later load-bearing or center-of-gravity model is specified.

Decision needed later:
- Keep weight as display/search/export only
- Or introduce pallet total weight and per-layer load warnings

### 8.2 `.xlsx` Library Choice

The implementation phase must select a browser-compatible `.xlsx` parser with a fixed version. The chosen library must work with static export and pass build.

Decision needed during Phase 4:
- Use a lightweight parser with limited formatting support
- Or use a full parser with larger bundle cost

### 8.3 Partial Support Area Calculation

Packed blocks generated by the engine should not overlap, so support area can usually be summed safely. For robustness, V2 should consider a union-area calculation if imported/restored results may contain overlapping supports.

Decision needed during Phase 5:
- Implement simple sum first with safety gate non-overlap guarantee
- Or implement 2D rectangle union calculation immediately

### 8.4 Additional Simulation Optimization

For up to 3 selected templates, a practical V2 approach is to evaluate bounded priority orders and choose the result with least remaining volume. Full combinatorial search may be too slow for browser-only V2.

Decision needed during Phase 7:
- Bounded greedy permutations
- Or deeper search with calculation budget and progress UI

## 9. Suggested Commit Plan

1. `docs: add V2 field feedback roadmap`
2. `chore: prepare workspace schema v2 migration`
3. `feat: add field pallet presets and overhang recommendation`
4. `feat: extend block library metadata and filters`
5. `feat: add xlsx block import preview`
6. `feat: add loading priority and partial support policy`
7. `feat: simplify result view and add orientation arrows`
8. `feat: add multi-box chain simulation variants`
9. `docs: update V2 user guide and planning references`

## 10. Definition Of Done For V2 Feedback Scope

- V2 can load V1 saved local data and V1 backup files.
- Basic pallet and overhang pallet are available with offset 0.
- Overhang recommendation appears only when it improves a result.
- Box library supports optional weight and two-level groups.
- `.xlsx` upload can import valid box rows with preview and row-level errors.
- Execution review supports load priority and partial support option.
- Partial support uses 55% threshold when enabled and is OFF by default.
- Result screen no longer exposes placement detail or stacking order outputs.
- 3D result shows orientation arrows based on original upright direction.
- Additional simulation is a visible 5th stage.
- Additional simulation supports up to 3 selected boxes and variant comparison.
- All phase tests, typecheck, build, and responsive UI checks pass.
