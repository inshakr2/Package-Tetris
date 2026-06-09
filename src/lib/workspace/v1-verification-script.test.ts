import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const PACKAGE_JSON_PATH = join(process.cwd(), "package.json");
const README_PATH = join(process.cwd(), "README.md");
const FIELD_GUIDE_PATH = join(process.cwd(), "docs/field-demo-user-guide.md");

describe("v1 verification script", () => {
  it("package script는 V1 마감 검증 명령을 한 번에 실행한다", () => {
    // Given
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
      scripts?: Record<string, string>;
    };

    // When
    const script = packageJson.scripts?.["v1:verify"] ?? "";

    // Then
    assert.match(script, /npm test/);
    assert.match(script, /npx tsc --noEmit/);
    assert.match(script, /npm run field:audit/);
    assert.match(script, /npm run build/);
  });

  it("README와 현장 가이드는 V1 마감 검증 명령을 안내한다", () => {
    // Given
    const readme = readFileSync(README_PATH, "utf8");
    const fieldGuide = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(readme, /npm run v1:verify/);
    assert.match(fieldGuide, /npm run v1:verify/);
  });
});
