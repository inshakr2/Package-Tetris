import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-calculation-failure-layout", () => {
  it("결과 계산 실패 시 원인과 복구 CTA를 결과 영역에 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasFailureFlow =
      source.includes("createResultCalculationFailure") &&
      source.includes("const [resultFailure, setResultFailure] = useState<ResultCalculationFailure | null>(null)") &&
      source.includes("setResultFailure(createResultCalculationFailure(error))") &&
      source.includes("resultFailure={resultFailure}") &&
      source.includes('className="result-failure-banner"') &&
      source.includes('role="alert"') &&
      source.includes("계산 실패") &&
      source.includes("입력 수정") &&
      source.includes("다시 계산");

    // Then
    assert.equal(hasFailureFlow, true);
  });

  it("계산 실패 배너는 모바일에서 CTA를 한 컬럼으로 접고 긴 문구를 줄바꿈한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasBannerStyle =
      /\.result-failure-banner\s*{[\s\S]*?display:\s*grid;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/.test(css);
    const hasActionStyle =
      /\.result-failure-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const hasTouchStyle =
      /\.result-failure-actions\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-failure-actions\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.equal(hasBannerStyle && hasActionStyle && hasTouchStyle && hasMobileStyle, true);
  });
});
