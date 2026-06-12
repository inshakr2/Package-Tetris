# Package Tetris V2 Field Patch Plan

> **For agentic workers:** REQUIRED PROCESS: product-manager must consult business-analyst, ui-designer, ui-ux-tester, code-reviewer, and nextjs-developer before visible UI changes. Implementation must happen on `v2`, not `main`, until this patch scope is stable.

**Goal:** 2026-06-12 현장 피드백을 V2 후속 안정화 패치로 분리하고, 입력 오류 방지, 결과 해석성, 추가 시뮬레이션 선택성, 바람개비 배치 엔진 정합성을 단계적으로 해결한다.

**Architecture:** 프론트 단독 Next.js 구조를 유지한다. 입력/저장 무결성은 `src/lib/workspace/block-library.ts` 같은 순수 유틸에서 먼저 고정하고, 화면은 그 계약을 호출한다. 엔진 변경은 `packing-placement` 후보 좌표 생성과 `packing-engine` 회귀 테스트를 먼저 고정한 뒤 `chain-simulation`, `multi-chain-simulation`, `field:audit`까지 같은 안전 검증을 통과해야 한다.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Three.js, IndexedDB workspace persistence, JSON backup, Node test runner, `.xlsx` import.

---

## 1. PM Decision Summary

### 1.1 검토한 3가지 접근

1. **전체 피드백 일괄 패치**
   - 장점: 한 번에 체감 변화가 크다.
   - 단점: UI, 데이터 무결성, 엔진 탐색 전략이 한 커밋에 섞여 회귀 원인 추적이 어렵다.
   - 판단: 채택하지 않는다.

2. **UI 쉬운 항목 선반영 후 엔진 수정**
   - 장점: 빠르게 화면 피드백을 줄일 수 있다.
   - 단점: 현장 신뢰를 가장 크게 떨어뜨린 `690 x 370 x 580mm` 8개 케이스가 뒤로 밀린다.
   - 판단: 채택하지 않는다.

3. **계약 고정 우선, 입력/결과/엔진 분리 패치**
   - 장점: 실패 케이스를 먼저 테스트로 고정하고 각 패치의 영향을 좁힐 수 있다.
   - 단점: 첫 체감 개선까지 단계가 하나 더 필요하다.
   - 판단: 채택한다.

### 1.2 PM 기본 결정안

- `690 x 370 x 580mm` 8개가 `기본 파레트 1100 x 1100 x 1550mm`에 1파레트로 들어간다는 현장 피드백은 V2 패치 목표로 채택한다.
- 이 패턴은 내부 문서와 테스트에서는 `바람개비 배치(pinwheel)`로 부른다. 사용자 UI에서는 필요한 경우 `엇갈림 배치`처럼 설명형 문구를 함께 쓴다.
- 박스 등록 치수 피드백은 placeholder 삭제가 아니라 `치수 기본 입력값 제거`로 정규화한다.
- 박스명 중복은 화면만이 아니라 저장 유틸 계약에서 막는다.
- 현재 작업 대상 박스 중복은 새 카드를 계속 만들지 않는다. 기본 동작은 기존 카드 수량에 합치고, 현장 사용자가 이해할 수 있는 상태 문구를 보여준다.
- `먼저 바닥에`와 `맨 아래 우선`은 같은 의미로 보이므로 중복을 제거한다. 기본 패치는 `기본 / 아래 우선` 2단계로 정리하고, `위로 배치 선호`는 실제 엔진 정책까지 함께 구현하는 별도 승인안으로 둔다.
- 3D 캔버스 클릭으로 박스 강조가 켜지는 동작은 제거한다. 박스 식별은 범례, hover tooltip, 2D 보기 중심으로 유지한다.
- 3D 오버레이는 공간 원래 치수 대신 선택된 결과 공간의 실제 적재 최대 치수인 `결과 최대치수`를 표시한다.

## 2. Role Reports

### 2.1 Business Analyst

- 이번 피드백은 단순 UI 수정이 아니라 `용어`, `입력 제약`, `결과 해석`, `엔진 정합성`이 섞인 패치다.
- `먼저 바닥에`와 `맨 아래 우선`은 현장 언어상 중복이다.
- `가능하면 위로`는 copy 변경이 아니라 실제 배치 정책 변경이다.
- `690 x 370 x 580mm` 8개 케이스는 현장 승인 회귀 케이스로 별도 고정해야 한다.

### 2.2 UI Designer

- 박스 등록 입력은 빈 치수 입력 상태에서 시작하고, 저장 가능/불가능 상태를 버튼과 짧은 안내로 보여준다.
- 우선순위 버튼은 중복 의미를 제거한다. 릴리즈 안전안은 `기본`, `아래 우선` 2단계다.
- `위로 배치 선호`는 실제 엔진 정책이 구현될 때만 노출한다. 라벨만 바꾸면 현장 오해가 커진다.
- 결과 3D의 숫자 오버레이는 `가로 / 세로 / 높이` 세 타일로 유지하되 라벨을 `결과 최대치수`로 명확히 바꾼다.
- 추가 시뮬레이션 선택 카드는 우측 상단에 48px 터치 가능한 `X` 또는 삭제 아이콘을 둔다. 순위 이동 버튼과 겹치지 않게 우측 액션 컬럼을 유지한다.

### 2.3 UI/UX Tester

- 360px, 390px, 768px, 1280px에서 치수 입력 행, 현재 작업 카드, 추가 시뮬레이션 선택 카드, 3D 오버레이가 가로 넘침을 만들면 실패로 본다.
- UI 변경 후에는 source-level layout test만으로 끝내지 않고 브라우저에서 주요 CTA와 카드 bounding box를 확인한다.
- 3D 클릭 강조 제거 후에도 hover tooltip과 범례로 박스 종류를 확인할 수 있어야 한다.
- `위로 배치 선호`를 승인해 구현하는 경우 버튼명만으로 의미가 부족할 수 있으므로 실행 전 확인 요약에 적용된 박스 수와 설명을 보여준다.
- 현재 추가 시뮬레이션의 선택 순서 기반 UI에서는 기존 `먼저추가/최우선추가` 버튼 중복 문제가 재현되지 않는다. 이번 패치의 우선순위 버튼 중복 이슈는 주로 3번 실행 전 확인의 현재 작업 카드에 남아 있는 `먼저 바닥에`와 `맨 아래 우선`을 대상으로 본다.
- 자동 테스트는 통과해도 실제 브라우저에서 3D 클릭, 선택 카드 해제 동선, 다운로드/업로드 side effect는 별도로 확인해야 한다.

### 2.4 Next.js Developer

- 서버 기능은 추가하지 않는다. 모든 작업은 기존 client component, 순수 유틸, worker 계산 경로 안에서 처리한다.
- `박스명 중복 방지`는 `tetris-workspace-app.tsx` handler만이 아니라 `block-library.ts`에 공통 정책으로 두는 것이 안전하다.
- `작업 대상 중복 방지`는 `addBlockTemplateToDraft` 정책을 바꾸는 작업이며 수량 합산, 우선순위 충돌, undo 문구를 함께 정의해야 한다.
- `위로 배치 선호`는 기존 `loadPriority` 점수만으로는 의미가 애매하므로, 구현하려면 migration과 정렬 규칙을 같이 다뤄야 한다.
- `690 x 370 x 580mm`는 greedy first-fit의 탐색 후보 부족 이슈다. 일반 exact solver가 아니라 dimension-aware 후보 좌표를 먼저 늘리는 작은 휴리스틱이 적절하다.

### 2.5 Code Reviewer

- `690 x 370 x 580mm` 케이스는 `usedSpaceCount`, 블록 수, 좌표/회전 서명을 회귀 테스트로 고정해야 한다.
- 추가 시뮬레이션은 `custom-priority`만 검증하지 말고 `recommended`, `custom-priority`, 각 `template-priority` variant 전체를 안전 검증해야 한다.
- 엔진 패치 후에는 경계 초과, 충돌, 공중 배치, 지지면, 깨짐주의 정책을 모두 다시 검증한다.
- 무거운 현장 회귀 테스트는 `field:audit`에 포함하되, 빠른 단위 테스트와 역할을 구분한다.

## 3. External Research Notes

- 물류/트럭 적재에서 pinwheel 또는 pinwheeling은 직사각형 화물을 서로 다른 방향으로 번갈아 놓아 공간 활용을 높이는 배치 방식으로 쓰인다. 참고: [Hale Trailer - Pinwheel Pallet Loading](https://haletrailer.com/blog/pinwheel-pallet-loading/).
- 물류 안전 원칙은 공간 효율만으로 끝나지 않는다. OSHA는 계단식으로 쌓인 자재가 미끄러짐, 낙하, 붕괴를 막도록 안정적으로 쌓이거나 고정되어야 한다고 설명한다. 참고: [OSHA 1926.250](https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.250), [OSHA 1910.176](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.176).

## 4. Workstreams And Order

```mermaid
flowchart TD
  A["Phase 0: 회귀 계약 고정"] --> B["Phase 1: 박스 등록/현재 작업 중복 방지"]
  A --> C["Phase 2: 바람개비 배치 엔진 개선"]
  B --> D["Phase 3: 실행 전 우선순위 의미 재설계"]
  C --> E["Phase 4: 결과 3D 해석성 개선"]
  D --> F["Phase 5: 추가 시뮬레이션 선택 카드 정리"]
  E --> G["Phase 6: 문서/현장 검증 정리"]
  F --> G
```

## 5. Phase 0. Regression Contract First

**Goal:** 구현 전에 현장 피드백을 테스트 계약으로 고정한다.

**Files:**
- Modify: `src/lib/workspace/packing-engine.test.ts`
- Modify: `src/lib/workspace/packing-field-scenarios.ts`
- Modify: `src/lib/workspace/packing-field-scenarios.test.ts`
- Modify: `src/lib/workspace/multi-chain-simulation.test.ts`
- Create: `src/lib/workspace/packed-space-signature.ts`
- Create: `src/lib/workspace/packed-space-signature.test.ts`

**Steps:**
1. `packed-space-signature.ts`를 추가해 `PackedSpace`의 블록을 `zMm`, `yMm`, `xMm`, `rotation`, `widthMm`, `depthMm`, `heightMm` 순으로 정렬한 문자열 signature로 만든다.
2. `690 x 370 x 580mm` 8개 기본 파레트 케이스가 현재 2공간을 반환한다는 실패 테스트를 먼저 작성한다.
3. 목표 signature는 한 레이어에 4개, 총 2레이어다.

```text
z=0:
- x=0,   y=0,   w=690, d=370, h=580, rotation=xyz
- x=690, y=0,   w=370, d=690, h=580, rotation=yxz
- x=0,   y=370, w=370, d=690, h=580, rotation=yxz
- x=410, y=690, w=690, d=370, h=580, rotation=xyz

z=580:
- 위 4개와 같은 x/y/w/d/rotation, z만 580
```

4. 해당 결과가 `usedSpaceCount=1`, `blocks.length=8`, `unloadedBlockCount=0`을 만족해야 한다.
5. 모든 결과 공간에 대해 기존 안전 검증을 실행한다.
6. 추가 시뮬레이션 variant 전체를 검증하도록 `field:audit` 보강 계획을 테스트에 남긴다.

**Acceptance Criteria:**
- 현재 엔진에서 `690 x 370 x 580mm` 8개 케이스가 실패하는 테스트가 먼저 생긴다.
- 목표 배치는 공간 경계, 충돌, 지지면, 깨짐주의 정책을 모두 통과해야 한다.

## 6. Phase 1. Box Registration And Current Work Integrity

**Goal:** 저장 박스와 현재 작업 박스가 중복으로 늘어나는 문제를 막고, 치수 기본값으로 인한 오입력을 줄인다.

**Files:**
- Modify: `src/lib/workspace/block-library.ts`
- Modify: `src/lib/workspace/block-library.test.ts`
- Modify: `src/lib/workspace/block-template-xlsx-import.ts`
- Modify: `src/lib/workspace/block-template-xlsx-import.test.ts`
- Modify: `src/lib/workspace/draft-block-xlsx-import.ts`
- Modify: `src/lib/workspace/draft-block-xlsx-import.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/lib/workspace/block-library-search-layout.test.ts`
- Modify: `src/lib/workspace/draft-block-xlsx-import-layout.test.ts`

**Implementation Direction:**
- `normalizeBlockTemplateNameKey(name)`을 공통 유틸로 승격한다.
- 수동 신규 저장은 같은 정규화 박스명이 있으면 저장하지 않고 오류 문구를 표시한다.
- 수정 저장은 자기 자신을 제외하고 같은 이름이 있으면 막는다.
- 빈 이름을 `신규 박스`로 자동 치환하지 않는다. 박스명은 필수로 둔다.
- 박스 치수 form state는 `number | ""`를 허용하고 신규 등록 기본값은 빈 값으로 둔다.
- 저장 버튼은 박스명, 가로, 세로, 높이가 모두 유효할 때만 활성화한다.
- 현재 작업에 같은 `blockTemplateId`를 추가하면 새 카드 대신 기존 카드 수량에 합친다.
- 수량 합산 시 기존 `loadPriority`를 유지하고, 합산 사실을 status 문구로 보여준다.
- 현재 작업 `.xlsx` import에서 같은 박스명이 여러 행에 있으면 행 단위 오류 대신 수량 합산 미리보기를 보여준다. 잘못된 수량은 기존처럼 오류 행으로 남긴다.

**Acceptance Criteria:**
- 신규 박스 등록의 가로/세로/높이는 빈 입력으로 시작한다.
- 중복 박스명은 수동 저장, 수정 저장, 저장 박스 `.xlsx` import 모두에서 같은 기준으로 막힌다.
- 현재 작업에 같은 박스를 다시 추가해도 카드가 늘어나지 않는다.
- 중복 추가는 수량 합산 또는 명확한 안내로 처리된다.
- 기존 백업/IndexedDB에서 숫자 치수는 그대로 로드된다.

## 7. Phase 2. Pinwheel Placement Engine Patch

**Goal:** 동일 박스 반복 적재에서 바람개비형 엇갈림 배치를 탐색해 현장 케이스를 1파레트로 계산한다.

**Files:**
- Modify: `src/lib/workspace/packing-placement.ts`
- Modify: `src/lib/workspace/packing-placement.test.ts`
- Modify: `src/lib/workspace/packing-engine.ts`
- Modify: `src/lib/workspace/packing-engine.test.ts`
- Modify: `src/lib/workspace/packing-output-safety.test.ts`
- Modify: `src/lib/workspace/packed-result-validation.test.ts`
- Modify: `src/lib/workspace/chain-simulation.test.ts`
- Modify: `src/lib/workspace/multi-chain-simulation.test.ts`
- Modify: `src/lib/workspace/packing-field-scenarios.ts`

**Implementation Direction:**
- full backtracking이나 외부 solver는 도입하지 않는다.
- `findFirstStablePlacement`의 후보 좌표를 rotation별 dimension-aware 방식으로 확장한다.
- 각 축 후보에 아래 값을 포함한다.

```ts
[
  0,
  usableAxisSize - candidateAxisSize,
  ...blocks.map((block) => blockStart),
  ...blocks.map((block) => blockEnd),
  ...blocks.map((block) => blockStart - candidateAxisSize),
  ...blocks.map((block) => blockEnd - candidateAxisSize)
]
```

- 후보 좌표는 `0 <= value <= usableAxisSize - candidateAxisSize` 범위만 남긴다.
- 정렬은 기존처럼 낮은 `z`, 낮은 `y`, 낮은 `x`를 우선하되, 동일 높이에서 남는 공간을 줄이는 tie-breaker를 추가할지 테스트 결과를 보고 결정한다.
- Phase 0 signature가 통과해야 한다.
- 추가 시뮬레이션도 같은 엔진을 사용하므로 별도 로직 복사는 하지 않는다.

**Acceptance Criteria:**
- `690 x 370 x 580mm` 8개 기본 파레트 케이스는 1공간에 8개가 모두 적재된다.
- 기존 현장 audit 6개 기능 검증은 그대로 통과한다.
- 부분 지지 OFF/ON, 깨짐주의 정책, 경계/충돌 검증이 유지된다.
- 계산 시간이 현장 audit 기준에서 급격히 증가하지 않는다.

## 8. Phase 3. Loading Preference Redesign

**Goal:** `먼저 바닥에`와 `맨 아래 우선` 중복을 없애고, 현장 사용자가 이해할 수 있는 배치 우선 설정으로 정리한다.

**Files:**
- Modify: `src/lib/workspace/types.ts`
- Modify: `src/lib/workspace/load-priority.ts`
- Modify: `src/lib/workspace/block-library.ts`
- Modify: `src/lib/workspace/workspace-migration.ts`
- Modify: `src/lib/workspace/result-freshness.test.ts`
- Modify: `src/lib/workspace/draft-block-xlsx-import.ts`
- Modify: `src/lib/workspace/draft-block-xlsx-import.test.ts`
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/lib/workspace/draft-block-priority-layout.test.ts`
- Modify: `docs/field-demo-user-guide.md`
- Modify: `docs/development-deliverables.md`

**Implementation Direction:**
- 이번 패치 기본안은 `기본`, `아래 우선` 2단계다.
- `아래층 우선` 섹션 라벨은 `배치 우선`으로 바꿔 추후 상단 선호 확장을 막지 않는다.
- 기존 `먼저 바닥에`, `맨 아래 우선`은 모두 `아래 우선`으로 보정한다.
- `위로 배치 선호`는 별도 사용자 승인 후 확장한다. 승인되면 내부 모델은 숫자 우선순위만 계속 쓰지 않고 `placementPreference` enum으로 확장한다.

```ts
type PlacementPreference = "normal" | "floor-first" | "top-preferred";
```

- 2단계 기본안에서는 기존 numeric `loadPriority`를 유지하되, 5와 10을 모두 같은 `아래 우선` 라벨로 표시한다.
- `위로 배치 선호` 승인안에서는 migration이 기존 `loadPriority` 5와 10을 모두 `"floor-first"`로 보정하고, 엔진 정렬은 `"floor-first"`를 먼저 배치하며 `"top-preferred"`는 같은 조건에서 늦게 배치한다.
- `.xlsx` 현재 작업 포맷은 새 컬럼명 `적재위치타입`으로 전환한다.
- 호환성 때문에 기존 `아래층우선타입` 컬럼은 계속 읽되, 문서와 샘플은 `적재위치타입`만 안내한다.
- 2단계 기본안은 `1=기본`, `2=아래우선`을 안내한다.
- `위로 배치 선호` 승인안은 `1=기본`, `2=아래우선`, `3=위로배치선호`를 안내한다.

**Acceptance Criteria:**
- 같은 동작을 하는 두 버튼이 동시에 보이지 않는다.
- 기존 작업본의 `먼저 바닥에`/`맨 아래 우선` 설정은 `아래 우선`으로 안전하게 보정된다.
- 2단계 기본안에서는 실행 전 확인 요약이 `아래 우선` 지정 수를 보여준다.
- `위로 배치 선호` 승인안에서는 `위로 배치 선호`로 지정한 박스가 가능한 조건에서 다른 일반 박스보다 늦게 배치되는 테스트가 있다.

## 9. Phase 4. Result 3D Interpretation Patch

**Goal:** 결과 화면에서 실제 적재 크기와 방향을 더 직관적으로 확인하게 하고, 의도치 않은 클릭 강조를 제거한다.

**Files:**
- Create: `src/lib/workspace/packed-space-bounds.ts`
- Create: `src/lib/workspace/packed-space-bounds.test.ts`
- Modify: `src/lib/workspace/packing-scene.ts`
- Modify: `src/lib/workspace/packing-scene.test.ts`
- Modify: `src/components/result-stage/result-3d-canvas.client.tsx`
- Modify: `src/lib/workspace/result-3d-dimension-overlay-layout.test.ts`
- Modify: `src/lib/workspace/result-3d-orientation-arrow-layout.test.ts`
- Modify: `src/lib/workspace/result-selection-clear-action-layout.test.ts`
- Modify: `src/app/globals.css`

**Implementation Direction:**
- `calculatePackedSpaceBounds(blocks)`를 추가한다.
- 선택된 결과 공간의 `maxX - minX`, `maxY - minY`, `maxZ - minZ`를 `결과 최대치수`로 표시한다.
- 블록이 없으면 `-`를 표시한다.
- 기존 `3D 공간 치수` aria-label은 `3D 결과 최대치수`로 바꾼다.
- 3D 캔버스 클릭으로 `onSelectBlockTemplate`을 호출하지 않는다.
- 3D 캔버스 내부 opacity 기반 강조와 `강조 해제` 버튼은 제거한다.
- 범례 또는 2D 보기에서의 선택/강조는 별도 피드백이 없으므로 유지한다.
- 방향 화살표는 `THREE.ArrowHelper` 선분 대신 `THREE.ShapeGeometry` 또는 얇은 `THREE.Mesh` 기반의 납작한 면형 화살표로 교체한다.
- 화살표는 블록 raycast 대상에 포함하지 않는다.

**Acceptance Criteria:**
- 3D를 회전하다 클릭을 놓아도 박스 강조 상태가 생기지 않는다.
- 3D 오버레이는 공간 치수가 아니라 실제 결과 최대치수를 보여준다.
- 방향 화살표는 선분보다 면적으로 보이고, 입력 높이 방향 의미는 유지한다.
- hover tooltip과 범례는 계속 사용할 수 있다.
- WebGL fallback 문구는 유지된다.

## 10. Phase 5. Additional Simulation Selection UX

**Goal:** 추가 박스 시뮬레이션에서 선택한 박스를 빠르게 취소하고, 선택 순위와 수량 조건을 이해하기 쉽게 유지한다.

**Files:**
- Modify: `src/components/tetris-workspace-app.tsx`
- Modify: `src/lib/workspace/multi-chain-simulation-layout.test.ts`
- Modify: `src/lib/workspace/chain-simulation-requested-quantity-layout.test.ts`
- Modify: `src/app/globals.css`

**Implementation Direction:**
- 선택된 추가 박스 순위 카드 우측 상단에 삭제 버튼을 둔다.
- 삭제 버튼은 `aria-label="{박스명} 추가 시뮬레이션 선택 해제"`를 사용한다.
- 삭제 시 선택 순서, 지정 수량, preview 결과를 함께 갱신한다.
- 3개 카드가 모두 있을 때도 카드 높이가 과도하게 커지지 않도록 우측 액션 컬럼 안에 배치한다.
- 360px에서는 삭제 버튼이 카드 제목 줄 오른쪽에 남고, 순위 이동 버튼은 다음 줄에서 2열 이하로 접는다.

**Acceptance Criteria:**
- 선택한 추가 박스를 한 번에 해제할 수 있다.
- 삭제 후 남은 카드 순위가 1부터 다시 정렬된다.
- 추가 결과 preview는 삭제 후 stale 상태가 되거나 자동 재계산 기준이 명확히 표시된다.
- 360px, 390px, 768px, 1280px에서 카드가 가로 넘치지 않는다.

## 11. Phase 6. Documentation And Verification

**Goal:** 구현 상태와 현장 가이드를 일치시키고, 다음 PM 사이클에서 같은 기준으로 검증한다.

**Files:**
- Modify: `docs/plans/2026-06-10-v2-field-feedback-roadmap.md`
- Modify: `docs/field-demo-user-guide.md`
- Modify: `docs/development-deliverables.md`
- Modify: `src/lib/workspace/v2-roadmap-document.test.ts`
- Modify: `src/lib/workspace/field-demo-user-guide-document.test.ts`
- Modify: `src/lib/workspace/development-deliverables-document.test.ts`

**Acceptance Criteria:**
- 문서에는 `맨 아래 우선`을 새 기능 안내로 남기지 않는다.
- 현재 작업 엑셀 포맷은 `적재위치타입`을 기준으로 안내한다.
- 바람개비 배치는 내부 문서에 회귀 케이스로 설명한다.
- 현장 사용자 가이드에는 `결과 최대치수`, 선택 카드 해제, 치수 빈 입력 상태를 반영한다.

## 12. Required Verification For Every Implementation Cycle

```bash
git status --short --branch
npm test
npx tsc --noEmit
npm run field:audit
npm run build
git diff --check
```

UI가 바뀐 cycle은 추가로 브라우저에서 아래 폭을 확인한다.

- 360px mobile
- 390px mobile
- 768px tablet
- 1280px desktop

검증 항목:

- horizontal overflow 없음
- 주요 버튼 44~48px 이상 터치 가능
- 박스 등록 치수 입력이 부모 그리드를 넘지 않음
- 현재 작업 카드 총 부피/삭제 버튼이 그리드를 넘지 않음
- 추가 시뮬레이션 선택 카드 우측 삭제 버튼이 순위 버튼과 겹치지 않음
- 3D 캔버스 nonblank
- 3D 회전 후 pointer up/click으로 강조 상태가 생기지 않음
- 결과 최대치수 오버레이가 캔버스 조작을 막지 않음

## 13. Tracking Risks

- `위로 배치 선호`는 현장 요구와 맞을 수 있지만, 실제 엔진에서는 “늦게 배치” 휴리스틱이다. 현장 기대가 “무조건 최상단”이면 후속 정책이 필요하므로 기본 패치에는 넣지 않는다.
- `690 x 370 x 580mm` 케이스는 동일 SKU 반복에 대한 작은 휴리스틱으로 해결한다. 혼합 SKU 전체 최적화 solver 도입은 V2 현재 범위를 넘는다.
- 현재 작업 중복을 수량 합산으로 처리하면 기존 “같은 박스를 서로 다른 우선순위로 두 카드 운영”은 불가능해진다. 현장 피드백은 중복 방지를 요구했으므로 합산을 기본으로 한다.
- 3D 클릭 강조 제거 후 일부 사용자는 캔버스에서 직접 박스를 찾는 기능이 줄어든다고 느낄 수 있다. 범례와 hover tooltip을 유지해 보완한다.
- 저장 박스 import와 현재 작업 import는 둘 다 중복 관련 정책이 바뀐다. 샘플 파일, 포맷 보기 모달, 문서 테스트를 함께 바꾸지 않으면 현장 자동화 파일과 UI 안내가 어긋난다.

## 14. Suggested Commit Plan

1. `docs: add v2 field patch plan`
2. `test: lock field pinwheel packing regression`
3. `fix: prevent duplicate box and draft entries`
4. `fix: support pinwheel placement candidates`
5. `feat: clarify loading placement preferences`
6. `feat: improve result 3d interpretation`
7. `feat: add chain selection remove action`
8. `docs: update v2 field guide for patch scope`
