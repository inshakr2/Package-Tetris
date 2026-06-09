import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createFieldPackingScenarios,
  runFieldPackingScenarioAudit
} from "./packing-field-scenarios";
import { runPackingEngineV0 } from "./packing-engine";

describe("packing-field-scenarios", () => {
  it("현장 시연용 preset 공간별 대량 적재 결과는 안전 기준을 모두 통과한다", () => {
    // Given
    const scenarios = createFieldPackingScenarios();

    // When
    const audit = runFieldPackingScenarioAudit(scenarios, runPackingEngineV0);

    // Then
    assert.equal(audit.scenarioCount, 3);
    assert.equal(audit.failedScenarioNames.length, 0);
    assert.ok(audit.totalPackedBlockCount >= 40);
    assert.ok(audit.totalUsedSpaceCount >= 3);
  });

  it("현장 시나리오 이름은 작업자가 이해하는 공간명을 포함한다", () => {
    // Given / When
    const scenarioNames = createFieldPackingScenarios().map((scenario) => scenario.name);

    // Then
    assert.deepEqual(scenarioNames, [
      "파레트 기본 대량 혼합 박스",
      "20ft GP 장척 박스 혼합",
      "2.5톤반 낮은 짐칸 혼합"
    ]);
  });
});
