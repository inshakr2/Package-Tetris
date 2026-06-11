import { runChainSimulationV0, type ChainSimulationOutput } from "./chain-simulation";
import { type PlacementPolicy } from "./packing-placement";
import { calculateUsableSize } from "./presets";
import { BlockTemplate, PackedBlock, PackedSpace, ResultSummary } from "./types";

const MAX_MULTI_CHAIN_TEMPLATES = 3;
export const MAX_MULTI_CHAIN_ADDED_BLOCKS = 300;
const CALCULATION_LIMIT_WARNING = "계산량을 줄이기 위해 결과별 최대 300개까지만 계산했습니다.";

export type MultiChainSimulationVariantMode = "recommended" | "template-priority";

export interface MultiChainSimulationInput {
  result: ResultSummary;
  blockTemplates: BlockTemplate[];
  runId: string;
  policy: PlacementPolicy;
}

export interface MultiChainSimulationTemplateQuantity {
  blockTemplateId: string;
  blockName: string;
  addedQuantity: number;
}

export interface MultiChainSimulationVariant {
  variantId: string;
  label: string;
  mode: MultiChainSimulationVariantMode;
  priorityBlockTemplateId?: string;
  orderBlockTemplateIds: string[];
  addedQuantities: MultiChainSimulationTemplateQuantity[];
  totalAddedQuantity: number;
  spaces: PackedSpace[];
  averageUtilizationRate: number;
  remainingVolumeM3: number;
  warnings: string[];
}

export interface MultiChainSimulationOutput {
  runId: string;
  recommendedVariantId: string | null;
  variants: MultiChainSimulationVariant[];
  warnings: string[];
}

interface CandidateSimulation {
  order: BlockTemplate[];
  variant: Omit<MultiChainSimulationVariant, "variantId" | "label" | "mode" | "priorityBlockTemplateId">;
}

export function runMultiChainSimulationV0(input: MultiChainSimulationInput): MultiChainSimulationOutput {
  const blockTemplates = dedupeTemplates(input.blockTemplates);

  if (blockTemplates.length === 0) {
    return {
      runId: input.runId,
      recommendedVariantId: null,
      variants: [],
      warnings: ["추가 시뮬레이션 박스를 1개 이상 선택하세요."]
    };
  }

  if (blockTemplates.length > MAX_MULTI_CHAIN_TEMPLATES) {
    return {
      runId: input.runId,
      recommendedVariantId: null,
      variants: [],
      warnings: ["추가 시뮬레이션 박스는 최대 3개까지 선택할 수 있습니다."]
    };
  }

  if (!input.result.spaceSnapshot || !input.result.spaces?.length) {
    return {
      runId: input.runId,
      recommendedVariantId: null,
      variants: [],
      warnings: ["결과 공간 정보가 없어 추가 적재를 계산할 수 없습니다."]
    };
  }

  const candidates = createTemplatePermutations(blockTemplates).map((order, index) =>
    simulateTemplateOrder(input, order, `candidate-${index + 1}`)
  );
  const recommendedCandidate = chooseRecommendedCandidate(candidates);
  const recommendedVariantId = `${input.runId}-recommended`;
  const variants: MultiChainSimulationVariant[] = [
    {
      ...recommendedCandidate.variant,
      variantId: recommendedVariantId,
      label: "추천 결과",
      mode: "recommended"
    },
    ...blockTemplates.map((template) => {
      const priorityOrder = [template, ...blockTemplates.filter((item) => item.blockTemplateId !== template.blockTemplateId)];
      const candidate = simulateTemplateOrder(input, priorityOrder, `priority-${template.blockTemplateId}`);

      return {
        ...candidate.variant,
        variantId: `${input.runId}-priority-${template.blockTemplateId}`,
        label: `${template.name} 우선`,
        mode: "template-priority" as const,
        priorityBlockTemplateId: template.blockTemplateId
      };
    })
  ];

  return {
    runId: input.runId,
    recommendedVariantId,
    variants,
    warnings: []
  };
}

function simulateTemplateOrder(
  input: MultiChainSimulationInput,
  order: BlockTemplate[],
  runSuffix: string
): CandidateSimulation {
  let currentResult: ResultSummary = {
    ...input.result,
    spaces: clonePackedSpaces(input.result.spaces ?? [])
  };
  const outputs: ChainSimulationOutput[] = [];
  let remainingCalculationLimit = MAX_MULTI_CHAIN_ADDED_BLOCKS;

  order.forEach((template, index) => {
    if (remainingCalculationLimit <= 0) {
      outputs.push(createSkippedChainOutput(input, template, runSuffix, index));
      return;
    }

    const output = runChainSimulationV0({
      result: currentResult,
      blockTemplate: template,
      runId: `${input.runId}-${runSuffix}-${index + 1}`,
      policy: input.policy,
      requestedQuantity: remainingCalculationLimit
    });

    outputs.push(output);
    remainingCalculationLimit -= output.addedQuantity;
    currentResult = {
      ...currentResult,
      spaces: output.spaces,
      averageUtilizationRate: output.averageUtilizationRate
    };
  });

  const addedQuantities = outputs.map((output) => ({
    blockTemplateId: output.blockTemplateId,
    blockName: output.blockName,
    addedQuantity: output.addedQuantity
  }));
  const spaces = clonePackedSpaces(currentResult.spaces ?? []);

  return {
    order,
    variant: {
      orderBlockTemplateIds: order.map((template) => template.blockTemplateId),
      addedQuantities,
      totalAddedQuantity: addedQuantities.reduce((sum, item) => sum + item.addedQuantity, 0),
      spaces,
      averageUtilizationRate: currentResult.averageUtilizationRate,
      remainingVolumeM3: calculateRemainingVolumeM3(input.result, spaces),
      warnings: collectVariantWarnings(outputs, remainingCalculationLimit)
    }
  };
}

function createSkippedChainOutput(
  input: MultiChainSimulationInput,
  template: BlockTemplate,
  runSuffix: string,
  index: number
): ChainSimulationOutput {
  return {
    runId: `${input.runId}-${runSuffix}-${index + 1}`,
    blockTemplateId: template.blockTemplateId,
    blockName: template.name,
    addedQuantity: 0,
    spaces: clonePackedSpaces(input.result.spaces ?? []),
    averageUtilizationRate: input.result.averageUtilizationRate,
    warnings: []
  };
}

function collectVariantWarnings(outputs: ChainSimulationOutput[], remainingCalculationLimit: number) {
  const warnings = outputs.flatMap((output) => output.warnings);

  if (remainingCalculationLimit <= 0) {
    warnings.push(CALCULATION_LIMIT_WARNING);
  }

  return Array.from(new Set(warnings));
}

function chooseRecommendedCandidate(candidates: CandidateSimulation[]) {
  return candidates.slice().sort((left, right) => {
    const remainingVolumeDiff = left.variant.remainingVolumeM3 - right.variant.remainingVolumeM3;

    if (remainingVolumeDiff !== 0) {
      return remainingVolumeDiff;
    }

    const addedQuantityDiff = right.variant.totalAddedQuantity - left.variant.totalAddedQuantity;

    if (addedQuantityDiff !== 0) {
      return addedQuantityDiff;
    }

    const utilizationDiff = right.variant.averageUtilizationRate - left.variant.averageUtilizationRate;

    if (utilizationDiff !== 0) {
      return utilizationDiff;
    }

    return left.variant.orderBlockTemplateIds.join(":").localeCompare(right.variant.orderBlockTemplateIds.join(":"));
  })[0];
}

function dedupeTemplates(blockTemplates: BlockTemplate[]) {
  const templateMap = new Map<string, BlockTemplate>();

  blockTemplates.forEach((template) => {
    if (!templateMap.has(template.blockTemplateId)) {
      templateMap.set(template.blockTemplateId, template);
    }
  });

  return Array.from(templateMap.values());
}

function createTemplatePermutations(blockTemplates: BlockTemplate[]): BlockTemplate[][] {
  if (blockTemplates.length <= 1) {
    return [blockTemplates];
  }

  return blockTemplates.flatMap((template, index) => {
    const rest = blockTemplates.filter((_, candidateIndex) => candidateIndex !== index);

    return createTemplatePermutations(rest).map((tail) => [template, ...tail]);
  });
}

function calculateRemainingVolumeM3(result: ResultSummary, spaces: PackedSpace[]) {
  if (!result.spaceSnapshot) {
    return 0;
  }

  const usableSize = calculateUsableSize(result.spaceSnapshot);
  const usableVolumeM3 = dimensionsVolumeM3(usableSize);
  const remainingVolumeM3 = spaces.reduce((sum, space) => {
    return sum + Math.max(0, usableVolumeM3 - totalBlockVolumeM3(space.blocks));
  }, 0);

  return roundM3(remainingVolumeM3);
}

function totalBlockVolumeM3(blocks: PackedBlock[]) {
  return blocks.reduce(
    (sum, block) => sum + dimensionsVolumeM3({ widthMm: block.widthMm, depthMm: block.depthMm, heightMm: block.heightMm }),
    0
  );
}

function dimensionsVolumeM3(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundM3(value: number) {
  return Number(value.toFixed(3));
}

function clonePackedSpaces(spaces: PackedSpace[]): PackedSpace[] {
  return spaces.map((space) => ({
    ...space,
    blocks: space.blocks.map((block) => ({ ...block }))
  }));
}
