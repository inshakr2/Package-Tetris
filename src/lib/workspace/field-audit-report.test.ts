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
    assert.match(report.text, /기능 검증 6개/);
    assert.match(report.text, /부분 지지 허용 55% 현장 검증: 통과/);
    assert.match(report.text, /오버행 파레트 추천 현장 검증: 통과/);
    assert.match(report.text, /저장 박스 엑셀 일괄등록 현장 검증: 통과/);
    assert.match(report.text, /현재 작업 엑셀 등록 현장 검증: 통과/);
    assert.match(report.text, /추가 박스 시뮬레이션 현장 검증: 통과/);
    assert.match(report.text, /현장 피드백 추가 적재 시뮬레이션 검증: 통과/);
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

  it("V2 기능 검증이 실패하면 실패 코드와 확인 대상을 함께 보여준다", () => {
    // Given
    const audit = createAudit({
      failedFeatureCheckNames: ["추가 박스 시뮬레이션 현장 검증"],
      featureCheckResults: [
        {
          name: "부분 지지 허용 55% 현장 검증",
          detail: "OFF/ON 정책 차이 확인",
          isSafe: true,
          isExpected: true
        },
        {
          name: "추가 박스 시뮬레이션 현장 검증",
          detail: "추가 결과가 안전 검증을 통과하지 못함",
          isSafe: false,
          isExpected: false
        }
      ]
    });

    // When
    const report = createFieldAuditReport(audit);

    // Then
    assert.equal(report.exitCode, 1);
    assert.equal(report.ok, false);
    assert.match(report.text, /기능 확인 필요: 추가 박스 시뮬레이션 현장 검증/);
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
    failedFeatureCheckNames: [],
    featureCheckResults: [
      {
        name: "부분 지지 허용 55% 현장 검증",
        detail: "OFF/ON 정책 차이 확인",
        isSafe: true,
        isExpected: true
      },
      {
        name: "오버행 파레트 추천 현장 검증",
        detail: "기본 2공간, 오버행 1공간",
        isSafe: true,
        isExpected: true
      },
      {
        name: "저장 박스 엑셀 일괄등록 현장 검증",
        detail: "샘플 2행, 오류 0건",
        isSafe: true,
        isExpected: true
      },
      {
        name: "현재 작업 엑셀 등록 현장 검증",
        detail: "샘플 2행, 오류 0건",
        isSafe: true,
        isExpected: true
      },
      {
        name: "추가 박스 시뮬레이션 현장 검증",
        detail: "추가 결과 안전 검증 통과",
        isSafe: true,
        isExpected: true
      },
      {
        name: "현장 피드백 추가 적재 시뮬레이션 검증",
        detail: "기준 3공간, 추가 29개",
        isSafe: true,
        isExpected: true
      }
    ],
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
