import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("result-calculated-time-layout", () => {
  it("결과 헤더는 최신 결과 계산 시각을 현장 문구로 표시한다", () => {
    const hasCalculatedTime =
      source.includes('className="result-meta-strip"') &&
      source.includes("계산 시각") &&
      source.includes("<time dateTime={latestResult.createdAt}>{formatDateTime(latestResult.createdAt)}</time>") &&
      source.includes('className="result-meta-value"') &&
      source.includes("결과를 만들면 계산 시각이 표시됩니다.");

    assert.equal(hasCalculatedTime, true);
  });

  it("계산 시각 메타는 모바일에서 줄바꿈되고 넘침을 피한다", () => {
    const hasMetaStripStyle =
      /\.result-meta-strip\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/
        .test(styles);
    const hasMetaItemStyle =
      /\.result-meta-item\s*{[\s\S]*?min-height:\s*32px;[\s\S]*?border-radius:\s*8px;[\s\S]*?}/
        .test(styles);
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-meta-strip\s*{[\s\S]*?width:\s*100%;[\s\S]*?}[\s\S]*?\.result-meta-item\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/
        .test(styles);

    assert.equal(hasMetaStripStyle && hasMetaItemStyle && hasMobileStyle, true);
  });
});
