import { OptimizationInput, OptimizationOutput } from "./engine-contract";
import { validateOptimizationOutputInvariants } from "./packing-engine-invariants";

export const UNSAFE_PACKING_RESULT_WARNING =
  "계산 결과가 안전 기준에 맞지 않아 배치 좌표를 표시하지 않았습니다. 박스 크기와 수량을 확인한 뒤 다시 계산하세요.";

export function ensureSafeOptimizationOutput(
  input: OptimizationInput,
  output: OptimizationOutput
): OptimizationOutput {
  const validation = validateOptimizationOutputInvariants(input, output);

  if (validation.isValid) {
    return output;
  }

  return {
    ...output,
    usedSpaceCount: 0,
    averageUtilizationRate: 0,
    unloadedBlockCount: Math.max(output.unloadedBlockCount, getInputBlockCount(input)),
    spaces: [],
    warnings: appendUniqueWarning(output.warnings, UNSAFE_PACKING_RESULT_WARNING)
  };
}

function getInputBlockCount(input: OptimizationInput) {
  return input.blocks.reduce((sum, block) => sum + Math.max(0, block.quantity), 0);
}

function appendUniqueWarning(warnings: string[], warning: string) {
  if (warnings.includes(warning)) {
    return warnings;
  }

  return [...warnings, warning];
}
