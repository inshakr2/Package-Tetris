import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFieldAuditReport } from "./field-audit-report";
import type { FieldPackingScenarioPerformanceAudit } from "./packing-field-scenarios";

describe("field-audit-report", () => {
  it("현장 audit이 모두 통과하면 작업자가 읽을 수 있는 성공 요약을 만든다", () => {
    // Given
    const audit = createAudit();

    // When
    const report = createFieldAuditReport(audit);

    // Then
    assert.equal(report.exitCode, 0);
    assert.equal(report.ok, true);
    assert.match(report.text, /Package Tetris 현장 audit 통과/);
    assert.match(report.text, /시나리오 3개/);
    assert.match(report.text, /총 적재 90개/);
    assert.match(report.text, /총 계산 시간 310ms/);
  });

  it("안전 실패나 지연 시나리오가 있으면 실패 코드와 확인 대상을 함께 보여준다", () => {
    // Given
    const audit = createAudit({
      failedScenarioNames: ["2.5톤반 낮은 짐칸 혼합"],
      slowScenarioNames: ["20ft GP 장척 박스 혼합"]
    });

    // When
    const report = createFieldAuditReport(audit);

    // Then
    assert.equal(report.exitCode, 1);
    assert.equal(report.ok, false);
    assert.match(report.text, /Package Tetris 현장 audit 확인 필요/);
    assert.match(report.text, /안전 확인 필요: 2.5톤반 낮은 짐칸 혼합/);
    assert.match(report.text, /계산 지연: 20ft GP 장척 박스 혼합/);
  });
});

function createAudit(overrides: Partial<FieldPackingScenarioPerformanceAudit> = {}): FieldPackingScenarioPerformanceAudit {
  return {
    scenarioCount: 3,
    totalPackedBlockCount: 90,
    totalUsedSpaceCount: 5,
    totalElapsedMs: 310,
    failedScenarioNames: [],
    slowScenarioNames: [],
    scenarioResults: [
      {
        name: "파레트 기본 대량 혼합 박스",
        elapsedMs: 80,
        packedBlockCount: 16,
        usedSpaceCount: 1,
        unloadedBlockCount: 0,
        isSafe: true,
        isWithinBudget: true
      },
      {
        name: "20ft GP 장척 박스 혼합",
        elapsedMs: 120,
        packedBlockCount: 44,
        usedSpaceCount: 2,
        unloadedBlockCount: 0,
        isSafe: true,
        isWithinBudget: true
      },
      {
        name: "2.5톤반 낮은 짐칸 혼합",
        elapsedMs: 110,
        packedBlockCount: 30,
        usedSpaceCount: 2,
        unloadedBlockCount: 0,
        isSafe: true,
        isWithinBudget: true
      }
    ],
    ...overrides
  };
}
