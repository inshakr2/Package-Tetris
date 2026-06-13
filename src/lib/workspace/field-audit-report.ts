import type { FieldPackingScenarioPerformanceAudit } from "./packing-field-scenarios";

export interface FieldAuditReport {
  ok: boolean;
  exitCode: 0 | 1;
  text: string;
}

export function createFieldAuditReport(audit: FieldPackingScenarioPerformanceAudit): FieldAuditReport {
  const hasFailure =
    audit.failedScenarioNames.length > 0 ||
    audit.slowScenarioNames.length > 0 ||
    audit.failedFeatureCheckNames.length > 0;
  const lines = [
    hasFailure ? "Package Tetris 현장 audit 확인 필요" : "Package Tetris 현장 audit 통과",
    "",
    `- 시나리오 ${audit.scenarioCount}개`,
    `- 총 적재 ${audit.totalPackedBlockCount}개`,
    `- 총 사용 공간 ${audit.totalUsedSpaceCount}개`,
    `- 총 계산 시간 ${audit.totalElapsedMs}ms`
  ];

  audit.scenarioResults.forEach((result) => {
    const status = result.isSafe && result.isWithinBudget && result.unloadedBlockCount === 0 ? "통과" : "확인";
    lines.push(
      `- ${result.name}: ${status}, ${result.elapsedMs}ms, 적재 ${result.packedBlockCount}개, 공간 ${result.usedSpaceCount}개, 미적재 ${result.unloadedBlockCount}개, ${result.detail}`
    );
  });

  if (audit.featureCheckResults.length > 0) {
    lines.push(`- 기능 검증 ${audit.featureCheckResults.length}개`);
    audit.featureCheckResults.forEach((result) => {
      const status = result.isSafe && result.isExpected ? "통과" : "확인";
      lines.push(`- ${result.name}: ${status}, ${result.detail}`);
    });
  }

  if (audit.failedScenarioNames.length > 0) {
    lines.push(`- 안전 확인 필요: ${audit.failedScenarioNames.join(", ")}`);
  }

  if (audit.slowScenarioNames.length > 0) {
    lines.push(`- 계산 지연: ${audit.slowScenarioNames.join(", ")}`);
  }

  if (audit.failedFeatureCheckNames.length > 0) {
    lines.push(`- 기능 확인 필요: ${audit.failedFeatureCheckNames.join(", ")}`);
  }

  return {
    ok: !hasFailure,
    exitCode: hasFailure ? 1 : 0,
    text: lines.join("\n")
  };
}
