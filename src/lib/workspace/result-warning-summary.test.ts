import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createResultWarningSummary } from "./result-warning-summary";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("result-warning-summary", () => {
  it("중복 경고를 현장 확인용 건수로 압축한다", () => {
    const summary = createResultWarningSummary([
      "A 박스는 안전하게 올릴 자리가 없어 미적재 처리했습니다.",
      "A 박스는 안전하게 올릴 자리가 없어 미적재 처리했습니다.",
      "B 박스는 안전하게 올릴 자리가 없어 미적재 처리했습니다."
    ]);

    assert.deepEqual(summary, [
      { message: "A 박스는 안전하게 올릴 자리가 없어 미적재 처리했습니다.", count: 2 },
      { message: "B 박스는 안전하게 올릴 자리가 없어 미적재 처리했습니다.", count: 1 }
    ]);
  });

  it("빈 경고는 빈 요약으로 유지한다", () => {
    assert.deepEqual(createResultWarningSummary([]), []);
  });

  it("결과 화면은 미적재가 있으면 메인 요약 근처에 안내 callout을 표시한다", () => {
    const hasCallout =
      workspaceSource.includes("unloadedWarningSummary.length > 0") &&
      workspaceSource.includes('className="result-unloaded-callout"') &&
      workspaceSource.includes("미적재 확인") &&
      workspaceSource.includes("박스 수량을 줄이거나 더 큰 공간을 선택하세요.");

    assert.equal(hasCallout, true);
  });

  it("미적재 안내는 모바일에서 한 컬럼과 텍스트 줄바꿈을 유지한다", () => {
    const hasDesktopStyle =
      /\.result-unloaded-callout\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/
        .test(styles);
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-unloaded-callout\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
        .test(styles);

    assert.equal(hasDesktopStyle && hasMobileStyle, true);
  });
});
