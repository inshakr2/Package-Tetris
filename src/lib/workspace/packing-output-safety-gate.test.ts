import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const PACKING_ENGINE_PATH = join(process.cwd(), "src/lib/workspace/packing-engine.ts");

describe("packing-output-safety-gate", () => {
  it("runPackingEngineV0은 반환 직전에 안전 게이트를 통과한다", () => {
    // Given
    const source = readFileSync(PACKING_ENGINE_PATH, "utf8");

    // When
    const importsSafetyGate =
      source.includes('from "./packing-output-safety"') &&
      source.includes("ensureSafeOptimizationOutput");
    const returnsSafeOutput = /return\s+ensureSafeOptimizationOutput\(\s*input,\s*output\s*\)/.test(source);

    // Then
    assert.equal(importsSafetyGate && returnsSafeOutput, true);
  });
});
