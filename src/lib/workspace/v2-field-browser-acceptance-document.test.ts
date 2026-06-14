import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const BROWSER_ACCEPTANCE_PATH = join(
  process.cwd(),
  "docs/verification/2026-06-14-v2-field-browser-acceptance.md"
);
const BROWSER_ACCEPTANCE_METADATA_PATH = join(
  process.cwd(),
  "docs/verification/2026-06-14-v2-field-browser-acceptance.meta.json"
);

const REQUIRED_SOURCE_GUARD_TOKENS: Record<string, string[]> = {
  "src/lib/workspace/result-detail-removal-layout.test.ts": ["배치 상세", "쌓는 순서", "작업지시서"],
  "src/lib/workspace/result-remaining-volume-layout.test.ts": ["평균 적재율", "남은 부피", "미적재"],
  "src/lib/workspace/result-calculated-time-layout.test.ts": ["계산 시각"],
  "src/lib/workspace/result-warning-summary.test.ts": ["미적재 확인"],
  "src/lib/workspace/result-backup-action-layout.test.ts": ["백업 권장", "latestResult && needsExport", "백업 파일 만들기"],
  "src/lib/workspace/connectivity-status.test.ts": ["인터넷 끊김", "백업 권장"],
  "src/lib/workspace/result-calculation-feedback-layout.test.ts": [
    "creatingResult ? resultCalculationProgress.buttonLabel",
    "role=\"status\"",
    "aria-live"
  ],
  "src/lib/workspace/result-calculation-failure-layout.test.ts": ["계산 실패", "입력 수정", "다시 계산"],
  "src/lib/workspace/multi-chain-simulation-layout.test.ts": [
    "추가 가능 0",
    "기준 결과를 다시 계산해 추가 시뮬레이션을 이어갑니다.",
    "미리보기 취소",
    "직전 추가 취소",
    "선택한 박스와 조건은 유지됩니다."
  ],
  "src/lib/workspace/save-conflict-banner-layout.test.ts": [
    "data-readonly={isWorkspaceLocked}",
    "workspace-readonly-banner",
    "최신본 불러오기",
    "48px"
  ],
  "src/lib/workspace/webgl-fallback-action-layout.test.ts": [
    "WebGL 초기화가 실패했습니다.",
    "위 보기로 확인",
    "48px"
  ],
  "src/lib/workspace/import-conflict-panel-layout.test.ts": [
    "getImportConflictCopy",
    "가져오기 취소",
    "48px"
  ]
};

interface BrowserAcceptanceMetadata {
  branch: string;
  checkedAt: string;
  verifiedImplementationCommit: string;
  runtimeChangeIncluded: boolean;
  viewports: Array<{
    width: number;
    height: number;
    scrollWidth: number;
    horizontalOverflow: boolean;
    canvasRect: {
      width: number;
      height: number;
    };
    canvasNonWhitePixels: number;
    canvasDistinctSampleColors: number;
    minimumVisibleCtaHeight: number;
  }>;
  selectedAdditionalBoxClearButton: {
    verified: boolean;
    width: number;
    height: number;
  };
  sourceLevelGuards: string[];
  legacyResultOutputs: {
    placementDetail: {
      visible: boolean;
      exportable: boolean;
    };
    stackingOrder: {
      visible: boolean;
      exportable: boolean;
    };
    workInstruction: {
      visible: boolean;
      exportable: boolean;
    };
  };
  resultSummaryKpis: {
    labels: string[];
    definitions: Array<{
      label: string;
      meaning: string;
      fieldUse: string;
    }>;
    sourceLevelGuards: string[];
  };
  stateTransitionCoverage: Array<{
    state: string;
    fromState: string;
    trigger: string;
    toState: string;
    nextAction: string;
    nextActionVisible: boolean;
    contextPolicy: string;
    sourceLevelGuard: string;
  }>;
}

const EXPECTED_RESULT_KPI_LABELS = ["평균 적재율", "남은 부피", "미적재", "계산 시각"];

const EXPECTED_STATE_TRANSITIONS = [
  {
    state: "미적재 확인",
    fromState: "결과 생성 완료",
    trigger: "미적재 박스가 1개 이상 남음",
    toState: "결과 확인 유지",
    nextAction: "작업 수량 조정 또는 더 큰 공간 선택",
    contextPolicy: "현재 결과와 미적재 요약 유지",
    sourceLevelGuard: "src/lib/workspace/result-warning-summary.test.ts"
  },
  {
    state: "결과 백업 권장",
    fromState: "결과 생성 완료",
    trigger: "최신 결과가 아직 백업되지 않음",
    toState: "결과 확인 유지",
    nextAction: "백업 파일 만들기",
    contextPolicy: "현재 결과와 작업 데이터 유지",
    sourceLevelGuard: "src/lib/workspace/result-backup-action-layout.test.ts"
  },
  {
    state: "오프라인 백업 권장",
    fromState: "작업 중",
    trigger: "인터넷 끊김 감지 및 작업 데이터 존재",
    toState: "작업 중 유지",
    nextAction: "현재 작업 백업 만들기",
    contextPolicy: "브라우저 저장 상태를 유지하고 백업 안내",
    sourceLevelGuard: "src/lib/workspace/connectivity-status.test.ts"
  },
  {
    state: "결과 생성 중",
    fromState: "실행 전 확인",
    trigger: "결과 만들기 클릭",
    toState: "계산 진행",
    nextAction: "계산 완료까지 대기",
    contextPolicy: "중복 계산 CTA 비활성",
    sourceLevelGuard: "src/lib/workspace/result-calculation-feedback-layout.test.ts"
  },
  {
    state: "메인 결과 계산 실패",
    fromState: "계산 진행",
    trigger: "적재 계산 예외 발생",
    toState: "복구 필요",
    nextAction: "입력 수정 또는 다시 계산",
    contextPolicy: "실패 원인을 경고 배너에 유지",
    sourceLevelGuard: "src/lib/workspace/result-calculation-failure-layout.test.ts"
  },
  {
    state: "추가 시뮬레이션 계산 실패",
    fromState: "추가 시뮬레이션 계산 중",
    trigger: "추가 결과 계산 예외 또는 fatal warning",
    toState: "추가 시뮬레이션 복구 필요",
    nextAction: "기준 결과 다시 생성 또는 선택 초기화",
    contextPolicy: "선택한 추가 박스 조건은 사용자가 복구 행동을 선택할 때까지 유지",
    sourceLevelGuard: "src/lib/workspace/multi-chain-simulation-layout.test.ts"
  },
  {
    state: "추가 가능 0",
    fromState: "추가 시뮬레이션 계산 완료",
    trigger: "선택 조건에서 추가 가능한 박스가 없음",
    toState: "결과 안내",
    nextAction: "다른 박스 선택 또는 선택 초기화",
    contextPolicy: "계산 실패가 아닌 안내 상태로 유지",
    sourceLevelGuard: "src/lib/workspace/multi-chain-simulation-layout.test.ts"
  },
  {
    state: "미리보기 취소",
    fromState: "추가 결과 미리보기",
    trigger: "미리보기 취소 클릭",
    toState: "추가 시뮬레이션 조건 설정",
    nextAction: "조건 유지 후 다시 계산",
    contextPolicy: "선택 박스와 수량 조건 유지",
    sourceLevelGuard: "src/lib/workspace/multi-chain-simulation-layout.test.ts"
  },
  {
    state: "직전 추가 취소",
    fromState: "추가 결과 반영 완료",
    trigger: "직전 추가 취소 클릭",
    toState: "직전 반영 이전 결과",
    nextAction: "필요 시 추가 조건 재계산",
    contextPolicy: "반영된 추가 결과만 되돌림",
    sourceLevelGuard: "src/lib/workspace/multi-chain-simulation-layout.test.ts"
  },
  {
    state: "다른 탭 저장 충돌",
    fromState: "작업 중",
    trigger: "다른 탭 또는 창에서 최신 작업본 저장",
    toState: "읽기 전용 충돌 보호",
    nextAction: "최신본 불러오기 또는 현재 화면 백업",
    contextPolicy: "덮어쓰기 방지를 위해 편집 CTA 차단",
    sourceLevelGuard: "src/lib/workspace/save-conflict-banner-layout.test.ts"
  },
  {
    state: "WebGL 실패 2D 보기",
    fromState: "3D 결과 확인",
    trigger: "WebGL 렌더러 초기화 실패",
    toState: "2D 투영 확인",
    nextAction: "위 보기로 확인",
    contextPolicy: "결과 데이터는 유지하고 2D 보기로 대체",
    sourceLevelGuard: "src/lib/workspace/webgl-fallback-action-layout.test.ts"
  },
  {
    state: "백업 가져오기 충돌",
    fromState: "백업 파일 가져오기",
    trigger: "현재 작업과 가져오기 파일이 충돌",
    toState: "가져오기 결정 대기",
    nextAction: "현재 작업 유지, 가져온 파일로 교체, 복사본 열기 또는 가져오기 취소",
    contextPolicy: "사용자가 결정하기 전 현재 작업 유지",
    sourceLevelGuard: "src/lib/workspace/import-conflict-panel-layout.test.ts"
  }
];

describe("v2 field browser acceptance document", () => {
  it("V2 현장 브라우저 acceptance 기록은 화면 폭별 실제 확인 근거를 남긴다", () => {
    // Given / When
    const exists = existsSync(BROWSER_ACCEPTANCE_PATH);
    const metadataExists = existsSync(BROWSER_ACCEPTANCE_METADATA_PATH);
    const document = exists ? readFileSync(BROWSER_ACCEPTANCE_PATH, "utf8") : "";
    const metadata = metadataExists
      ? (JSON.parse(readFileSync(BROWSER_ACCEPTANCE_METADATA_PATH, "utf8")) as BrowserAcceptanceMetadata)
      : null;

    // Then
    assert.equal(exists, true);
    assert.equal(metadataExists, true);
    assert.ok(metadata);
    assert.equal(metadata.branch, "v2");
    assert.equal(metadata.checkedAt, "2026-06-14");
    assert.equal(metadata.verifiedImplementationCommit, "d05ad40");
    assert.equal(metadata.runtimeChangeIncluded, false);
    assert.deepEqual(
      metadata.viewports.map((viewport) => viewport.width),
      [360, 390, 768, 1280]
    );
    assert.equal(metadata.viewports.every((viewport) => viewport.horizontalOverflow === false), true);
    assert.equal(metadata.viewports.every((viewport) => viewport.scrollWidth <= viewport.width), true);
    assert.equal(metadata.viewports.every((viewport) => viewport.canvasRect.width > 0), true);
    assert.equal(metadata.viewports.every((viewport) => viewport.canvasRect.height > 0), true);
    assert.equal(metadata.viewports.every((viewport) => viewport.canvasNonWhitePixels > 1000), true);
    assert.equal(metadata.viewports.every((viewport) => viewport.canvasDistinctSampleColors > 10), true);
    assert.equal(metadata.viewports.every((viewport) => viewport.minimumVisibleCtaHeight >= 44), true);
    assert.equal(metadata.selectedAdditionalBoxClearButton.verified, true);
    assert.equal(metadata.selectedAdditionalBoxClearButton.height >= 48, true);
    assert.equal(Array.isArray(metadata.sourceLevelGuards), true);
    assert.ok(metadata.sourceLevelGuards.includes("src/lib/workspace/result-detail-removal-layout.test.ts"));
    assert.deepEqual(metadata.legacyResultOutputs, {
      placementDetail: {
        visible: false,
        exportable: false
      },
      stackingOrder: {
        visible: false,
        exportable: false
      },
      workInstruction: {
        visible: false,
        exportable: false
      }
    });
    assert.ok(metadata.resultSummaryKpis);
    assert.equal(Array.isArray(metadata.resultSummaryKpis.labels), true);
    assert.equal(Array.isArray(metadata.resultSummaryKpis.definitions), true);
    assert.equal(Array.isArray(metadata.resultSummaryKpis.sourceLevelGuards), true);
    assert.deepEqual(metadata.resultSummaryKpis.labels, EXPECTED_RESULT_KPI_LABELS);
    assert.deepEqual(
      metadata.resultSummaryKpis.definitions.map((definition) => definition.label),
      EXPECTED_RESULT_KPI_LABELS
    );
    assert.equal(metadata.resultSummaryKpis.definitions.every((definition) => definition.meaning.length > 0), true);
    assert.equal(metadata.resultSummaryKpis.definitions.every((definition) => definition.fieldUse.length > 0), true);
    assert.ok(metadata.resultSummaryKpis.sourceLevelGuards.includes("src/lib/workspace/result-remaining-volume-layout.test.ts"));
    assert.ok(metadata.resultSummaryKpis.sourceLevelGuards.includes("src/lib/workspace/result-calculated-time-layout.test.ts"));
    assert.ok(metadata.resultSummaryKpis.sourceLevelGuards.includes("src/lib/workspace/result-warning-summary.test.ts"));
    assert.equal(Array.isArray(metadata.stateTransitionCoverage), true);
    assert.deepEqual(
      metadata.stateTransitionCoverage.map(({ state, fromState, trigger, toState, nextAction, contextPolicy, sourceLevelGuard }) => ({
        state,
        fromState,
        trigger,
        toState,
        nextAction,
        contextPolicy,
        sourceLevelGuard
      })),
      EXPECTED_STATE_TRANSITIONS
    );
    assert.equal(metadata.stateTransitionCoverage.every((coverage) => coverage.nextActionVisible), true);
    assert.equal(
      metadata.stateTransitionCoverage.every((coverage) => coverage.sourceLevelGuard.endsWith(".test.ts")),
      true
    );
    assertSourceLevelGuardsCoverRequiredTokens(metadata.sourceLevelGuards);
    assertSourceLevelGuardsCoverRequiredTokens(metadata.resultSummaryKpis.sourceLevelGuards);
    assertSourceLevelGuardsCoverRequiredTokens(
      metadata.stateTransitionCoverage.map((coverage) => coverage.sourceLevelGuard)
    );
    assert.match(document, /Package Tetris V2 현장 브라우저 acceptance 기록/);
    assert.match(document, /브랜치[\s\S]*`v2`/);
    assert.match(
      document,
      new RegExp(`제품 구현 검증 기준 커밋[\\s\\S]*\`${metadata.verifiedImplementationCommit}\``)
    );
    assert.match(document, /문서\/테스트 전용 변경[\s\S]*런타임 UI[\s\S]*변경 없음/);
    assert.match(document, /360px[\s\S]*390px[\s\S]*768px[\s\S]*1280px/);
    assert.match(document, /horizontal overflow[\s\S]*없음/);
    assert.match(document, /(?:주요 CTA[\s\S]*44px|44px[\s\S]*주요 CTA)/);
    assert.match(document, /3D 캔버스[\s\S]*비어 있지 않음/);
    assert.match(document, /non-white[\s\S]*20,250px/);
    assert.match(document, /결과 최대치수[\s\S]*가로\/세로\/높이/);
    assert.match(document, /(?:WebGL fallback[\s\S]*2D 보기|2D 보기[\s\S]*WebGL fallback)/);
    assert.match(document, /백업 파일 만들기/);
    assert.match(document, /레거시 결과 산출물[\s\S]*배치 상세[\s\S]*쌓는 순서[\s\S]*작업지시서/);
    assert.match(document, /source-level 제거 가드[\s\S]*result-detail-removal-layout\.test\.ts/);
    assert.match(document, /배치 상세[\s\S]{0,80}미노출[\s\S]{0,80}export 없음/);
    assert.match(document, /쌓는 순서[\s\S]{0,80}미노출[\s\S]{0,80}export 없음/);
    assert.match(document, /작업지시서[\s\S]{0,80}미노출[\s\S]{0,80}export 없음/);
    assert.match(document, /결과 KPI source-level 가드[\s\S]*평균 적재율[\s\S]*사용된 적재공간별 적재율 평균[\s\S]*남은 부피[\s\S]*미적재[\s\S]*계산 시각/);
    assert.match(document, /상태 전이 source-level 가드[\s\S]*미적재 확인[\s\S]*결과 백업 권장[\s\S]*오프라인 백업 권장[\s\S]*결과 생성 중[\s\S]*메인 결과 계산 실패[\s\S]*추가 시뮬레이션 계산 실패[\s\S]*추가 가능 0[\s\S]*미리보기 취소[\s\S]*직전 추가 취소[\s\S]*다른 탭 저장 충돌[\s\S]*WebGL 실패 2D 보기[\s\S]*백업 가져오기 충돌/);
    assert.match(document, /결과 백업 권장[\s\S]*오프라인 백업 권장[\s\S]*분리/);
    assert.match(document, /미리보기 취소[\s\S]*선택 박스와 수량 조건 유지/);
    assert.match(document, /직전 추가 취소[\s\S]*반영된 추가 결과만 되돌림/);
    assert.match(document, /계산 실패[\s\S]*복구가 필요한 경고 배너/);
    assert.match(document, /추가 가능 0[\s\S]*결과 맥락 안의 안내 상태/);
    assert.match(document, /새 브라우저 실측이 아니라[\s\S]*source-level 가드/);
    assert.doesNotMatch(document, /배치 상세[\s\S]{0,80}(노출됨|표시됨|제공됨|열기|다운로드|복사)/);
    assert.doesNotMatch(document, /쌓는 순서[\s\S]{0,80}(노출됨|표시됨|제공됨|열기|다운로드|복사)/);
    assert.doesNotMatch(document, /작업지시서[\s\S]{0,80}(노출됨|표시됨|제공됨|열기|다운로드|복사)/);
    assert.match(document, /추가 박스 시뮬레이션[\s\S]*선택 순서/);
    assert.match(document, /선택 해제/);
    assert.match(document, /부분 지지 허용[\s\S]*55%/);
    assert.match(document, /바람개비[\s\S]*690[\s\S]*370[\s\S]*580[\s\S]*8개/);
    assert.doesNotMatch(document, /가로\/깊이\/높이/);
    assert.doesNotMatch(document, /THREE\.ArrowHelper/);
  });
});

function assertSourceLevelGuardsCoverRequiredTokens(paths: string[]) {
  for (const path of new Set(paths)) {
    const guardPath = join(process.cwd(), path);
    assert.equal(existsSync(guardPath), true, `${path} guard file must exist`);

    const source = readFileSync(guardPath, "utf8");
    const requiredTokens = REQUIRED_SOURCE_GUARD_TOKENS[path];
    assert.ok(requiredTokens, `${path} must be a known acceptance guard`);

    for (const token of requiredTokens) {
      assert.equal(source.includes(token), true, `${path} must guard ${token}`);
    }
  }
}
