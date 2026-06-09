import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("result-freshness-layout", () => {
  it("결과 화면은 입력 변경 시 재계산 안내 배너와 CTA를 표시한다", () => {
    // Given / When
    const hasFreshnessBanner =
      source.includes("createResultInputFingerprint") &&
      source.includes("createResultFreshnessState") &&
      source.includes('className="result-freshness-banner"') &&
      source.includes('role="status"') &&
      source.includes("입력이 바뀌었습니다") &&
      source.includes("결과 다시 만들기");

    // Then
    assert.equal(hasFreshnessBanner, true);
  });

  it("재계산 안내 배너는 모바일에서 한 컬럼과 터치 가능한 CTA를 유지한다", () => {
    // Given / When
    const hasBaseStyle =
      /\.result-freshness-banner\s*{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/
        .test(styles);
    const hasButtonStyle =
      /\.result-freshness-banner\s+\.secondary-button\s*{[\s\S]*?min-height:\s*44px;[\s\S]*?}/
        .test(styles);
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-freshness-banner\s*{[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*stretch;[\s\S]*?}[\s\S]*?\.result-freshness-banner\s+\.secondary-button\s*{[\s\S]*?width:\s*100%;[\s\S]*?min-height:\s*48px;[\s\S]*?}/
        .test(styles);

    // Then
    assert.equal(hasBaseStyle && hasButtonStyle && hasMobileStyle, true);
  });
});
