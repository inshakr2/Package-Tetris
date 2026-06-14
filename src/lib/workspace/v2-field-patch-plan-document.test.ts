import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const FIELD_PATCH_PLAN_PATH = join(process.cwd(), "docs/plans/2026-06-12-v2-field-patch-plan.md");

describe("v2 field patch plan document", () => {
  it("현재 작업 엑셀 import의 박스명 보정 범위와 오류 기준을 추적한다", () => {
    // Given
    const plan = readFileSync(FIELD_PATCH_PLAN_PATH, "utf8");

    // When / Then
    assert.match(plan, /현재 작업 `\.xlsx` import/);
    assert.match(plan, /앞뒤 공백과 대소문자/);
    assert.match(plan, /글자가 다른 박스명/);
    assert.match(plan, /오류 행/);
    assert.doesNotMatch(plan, /저장된 박스명과 정확히 일치/);
  });
});
