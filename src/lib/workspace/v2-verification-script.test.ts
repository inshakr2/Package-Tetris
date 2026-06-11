import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const PACKAGE_JSON_PATH = join(process.cwd(), "package.json");
const ROADMAP_PATH = join(process.cwd(), "docs/plans/2026-06-10-v2-field-feedback-roadmap.md");
const DEVELOPMENT_DELIVERABLES_PATH = join(process.cwd(), "docs/development-deliverables.md");

describe("v2 verification script", () => {
  it("package script는 V2 마감 검증 명령을 한 번에 실행한다", () => {
    // Given
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
      scripts?: Record<string, string>;
    };

    // When
    const script = packageJson.scripts?.["v2:verify"] ?? "";

    // Then
    assert.match(script, /npm test/);
    assert.match(script, /npx tsc --noEmit/);
    assert.match(script, /npm run field:audit/);
    assert.match(script, /npm run build/);
  });

  it("V2 로드맵과 개발 산출물 문서는 V2 마감 검증 명령을 안내한다", () => {
    // Given
    const roadmap = readFileSync(ROADMAP_PATH, "utf8");
    const developmentDeliverables = readFileSync(DEVELOPMENT_DELIVERABLES_PATH, "utf8");

    // When / Then
    assert.match(roadmap, /npm run v2:verify/);
    assert.match(developmentDeliverables, /npm run v2:verify/);
  });
});
