import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createFieldPackingScenarios,
  runFieldPackingScenarioAudit,
  runFieldPackingScenarioPerformanceAudit
} from "./packing-field-scenarios";
import { runPackingEngineV0 } from "./packing-engine";
import type { OptimizationOutput } from "./engine-contract";

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

  it("시나리오별 계산 시간이 예산을 넘으면 지연 시나리오로 기록한다", () => {
    // Given
    const scenarios = createFieldPackingScenarios().slice(0, 2);
    const nowMs = createFakeClock([0, 120, 120, 470]);

    // When
    const audit = runFieldPackingScenarioPerformanceAudit(scenarios, createEmptyOutput, {
      nowMs,
      scenarioBudgetMs: 250
    });

    // Then
    assert.equal(audit.scenarioCount, 2);
    assert.deepEqual(
      audit.scenarioResults.map((result) => [result.name, result.elapsedMs, result.isWithinBudget]),
      [
        ["파레트 기본 대량 혼합 박스", 120, true],
        ["20ft GP 장척 박스 혼합", 350, false]
      ]
    );
    assert.deepEqual(audit.slowScenarioNames, ["20ft GP 장척 박스 혼합"]);
  });

  it("현장형 대량 시나리오는 V1 시연 예산 안에서 계산된다", () => {
    // Given
    const scenarios = createFieldPackingScenarios();
    const scenarioBudgetMs = 5000;

    // When
    const audit = runFieldPackingScenarioPerformanceAudit(scenarios, runPackingEngineV0, {
      scenarioBudgetMs
    });

    // Then
    assert.equal(audit.failedScenarioNames.length, 0);
    assert.equal(audit.slowScenarioNames.length, 0);
    assert.ok(audit.totalElapsedMs < scenarioBudgetMs * scenarios.length);
    assert.ok(audit.totalPackedBlockCount >= 40);
  });

  it("현장 audit는 V2 부분 지지와 추가 박스 시뮬레이션 안전 검증을 포함한다", () => {
    // Given
    const scenarios = createFieldPackingScenarios();

    // When
    const audit = runFieldPackingScenarioPerformanceAudit(scenarios, runPackingEngineV0);

    // Then
    assert.deepEqual(
      audit.featureCheckResults.map((result) => [result.name, result.isSafe, result.isExpected]),
      [
        ["부분 지지 허용 55% 현장 검증", true, true],
        ["추가 박스 시뮬레이션 현장 검증", true, true],
        ["현장 피드백 추가 적재 시뮬레이션 검증", true, true]
      ]
    );
    assert.deepEqual(audit.failedFeatureCheckNames, []);
  });
});

function createFakeClock(values: number[]) {
  let index = 0;

  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

function createEmptyOutput(input: { runId: string }): OptimizationOutput {
  return {
    runId: input.runId,
    usedSpaceCount: 0,
    averageUtilizationRate: 0,
    unloadedBlockCount: 0,
    spaces: [],
    warnings: []
  };
}
