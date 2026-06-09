import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const README_PATH = join(process.cwd(), "README.md");

describe("repository README", () => {
  it("현장 시연 담당자가 실행, audit, 상세 가이드 위치를 바로 확인할 수 있다", () => {
    // Given / When
    const readmeExists = existsSync(README_PATH);
    const readme = readmeExists ? readFileSync(README_PATH, "utf8") : "";

    // Then
    assert.equal(readmeExists, true);
    assert.match(readme, /Package Tetris/);
    assert.match(readme, /npm run field:audit/);
    assert.match(readme, /npm run dev/);
    assert.match(readme, /docs\/field-demo-user-guide\.md/);
    assert.match(readme, /https:\/\/github\.com\/inshakr2\/Package-Tetris/);
  });
});
