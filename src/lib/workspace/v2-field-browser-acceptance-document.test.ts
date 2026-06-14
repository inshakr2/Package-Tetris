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
}

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
    assert.match(document, /Package Tetris V2 현장 브라우저 acceptance 기록/);
    assert.match(document, /브랜치[\s\S]*`v2`/);
    assert.match(
      document,
      new RegExp(`제품 구현 검증 기준 커밋[\\s\\S]*\`${metadata.verifiedImplementationCommit}\``)
    );
    assert.match(document, /문서\/테스트 전용 변경[\s\S]*런타임 UI[\s\S]*변경 없음/);
    assert.match(document, /360px[\s\S]*390px[\s\S]*768px[\s\S]*1280px/);
    assert.match(document, /horizontal overflow[\s\S]*없음/);
    assert.match(document, /주요 CTA[\s\S]*44px|44px[\s\S]*주요 CTA/);
    assert.match(document, /3D 캔버스[\s\S]*비어 있지 않음/);
    assert.match(document, /non-white[\s\S]*20,250px/);
    assert.match(document, /결과 최대치수[\s\S]*가로\/세로\/높이/);
    assert.match(document, /WebGL fallback[\s\S]*2D 보기|2D 보기[\s\S]*WebGL fallback/);
    assert.match(document, /백업 파일 만들기/);
    assert.match(document, /배치 상세|쌓는 순서/);
    assert.match(document, /미노출|없음|제거/);
    assert.match(document, /추가 박스 시뮬레이션[\s\S]*선택 순서/);
    assert.match(document, /선택 해제/);
    assert.match(document, /부분 지지 허용[\s\S]*55%/);
    assert.match(document, /바람개비[\s\S]*690[\s\S]*370[\s\S]*580[\s\S]*8개/);
    assert.doesNotMatch(document, /가로\/깊이\/높이/);
    assert.doesNotMatch(document, /THREE\.ArrowHelper/);
  });
});
