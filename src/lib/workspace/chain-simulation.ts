import { calculateUsableSize } from "./presets";
import {
  findFirstStablePlacement,
  type PlacementBounds,
  type PlacementPolicy
} from "./packing-placement";
import {
  INVALID_CHAIN_BASE_RESULT_WARNING,
  validatePackedResult
} from "./packed-result-validation";
import { BlockTemplate, PackedBlock, PackedSpace, ResultSummary } from "./types";

export interface ChainSimulationInput {
  result: ResultSummary;
  blockTemplate: BlockTemplate;
  runId: string;
  policy: PlacementPolicy;
  requestedQuantity?: number;
}

export interface ChainSimulationOutput {
  runId: string;
  blockTemplateId: string;
  blockName: string;
  addedQuantity: number;
  spaces: PackedSpace[];
  averageUtilizationRate: number;
  warnings: string[];
}

export const NO_STABLE_CHAIN_PLACEMENT_WARNING =
  "부피는 남아 있어도 안전하게 받칠 바닥면이 부족하거나 빈 공간이 나뉘어 추가 적재가 멈췄습니다.";

const NON_FATAL_CHAIN_SIMULATION_WARNINGS = new Set([NO_STABLE_CHAIN_PLACEMENT_WARNING]);

export function isFatalChainSimulationWarning(warning: string) {
  return !NON_FATAL_CHAIN_SIMULATION_WARNINGS.has(warning);
}

export function runChainSimulationV0(input: ChainSimulationInput): ChainSimulationOutput {
  const warnings: string[] = [];

  if (!input.result.spaceSnapshot || !input.result.spaces?.length) {
    return {
      runId: input.runId,
      blockTemplateId: input.blockTemplate.blockTemplateId,
      blockName: input.blockTemplate.name,
      addedQuantity: 0,
      spaces: input.result.spaces ?? [],
      averageUtilizationRate: input.result.averageUtilizationRate,
      warnings: ["결과 공간 정보가 없어 추가 적재를 계산할 수 없습니다."]
    };
  }

  const baseResultValidation = validatePackedResult(input.result, input.policy);

  if (!baseResultValidation.isValid) {
    return {
      runId: input.runId,
      blockTemplateId: input.blockTemplate.blockTemplateId,
      blockName: input.blockTemplate.name,
      addedQuantity: 0,
      spaces: input.result.spaces,
      averageUtilizationRate: input.result.averageUtilizationRate,
      warnings: baseResultValidation.reasons.length
        ? baseResultValidation.reasons
        : [INVALID_CHAIN_BASE_RESULT_WARNING]
    };
  }

  const usableSize = calculateUsableSize(input.result.spaceSnapshot);
  const usableVolumeM3 = dimensionsVolumeM3(usableSize);
  const templateVolumeM3 = dimensionsVolumeM3(input.blockTemplate.dimensions);
  const spaces = clonePackedSpaces(input.result.spaces);
  let addedQuantity = 0;
  const maxAdditionalByVolume = calculateMaxAdditionalByVolume(spaces, usableVolumeM3, templateVolumeM3);
  const requestedQuantity = normalizeRequestedQuantity(input.requestedQuantity);

  if (requestedQuantity === "invalid") {
    return {
      runId: input.runId,
      blockTemplateId: input.blockTemplate.blockTemplateId,
      blockName: input.blockTemplate.name,
      addedQuantity: 0,
      spaces,
      averageUtilizationRate: input.result.averageUtilizationRate,
      warnings: ["추가할 수량은 1개 이상이어야 합니다."]
    };
  }

  const calculationLimit =
    requestedQuantity === null ? maxAdditionalByVolume : Math.min(maxAdditionalByVolume, requestedQuantity);

  for (let index = 0; index < calculationLimit; index += 1) {
    const placement = findNextPlacement(spaces, input.blockTemplate, usableSize, input.policy);

    if (!placement) {
      break;
    }

    placement.space.blocks.push({
      blockId: `${input.runId}-block-${addedQuantity + 1}`,
      blockTemplateId: input.blockTemplate.blockTemplateId,
      name: input.blockTemplate.name,
      fragile: input.blockTemplate.fragile,
      xMm: placement.position.xMm,
      yMm: placement.position.yMm,
      zMm: placement.position.zMm,
      widthMm: placement.position.widthMm,
      depthMm: placement.position.depthMm,
      heightMm: placement.position.heightMm,
      rotation: placement.position.rotation
    });
    addedQuantity += 1;
  }

  if (calculationLimit > addedQuantity) {
    warnings.push(NO_STABLE_CHAIN_PLACEMENT_WARNING);
  }

  const outputSpaces = spaces.map((space) => ({
    ...space,
    utilizationRate: usableVolumeM3 > 0 ? roundRate(totalBlockVolumeM3(space.blocks) / usableVolumeM3) : 0
  }));

  return {
    runId: input.runId,
    blockTemplateId: input.blockTemplate.blockTemplateId,
    blockName: input.blockTemplate.name,
    addedQuantity,
    spaces: outputSpaces,
    averageUtilizationRate: calculateAverageUtilization(outputSpaces),
    warnings
  };
}

function normalizeRequestedQuantity(requestedQuantity: number | undefined) {
  if (requestedQuantity === undefined) {
    return null;
  }

  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
    return "invalid" as const;
  }

  return requestedQuantity;
}

function findNextPlacement(
  spaces: PackedSpace[],
  blockTemplate: BlockTemplate,
  usableSize: PlacementBounds,
  policy: PlacementPolicy
) {
  for (const space of spaces) {
    const position = findFirstStablePlacement(
      space.blocks,
      blockTemplate.dimensions,
      blockTemplate.fragile,
      usableSize,
      policy
    );

    if (position) {
      return { space, position };
    }
  }

  return null;
}
function calculateMaxAdditionalByVolume(
  spaces: PackedSpace[],
  usableVolumeM3: number,
  templateVolumeM3: number
) {
  if (usableVolumeM3 <= 0 || templateVolumeM3 <= 0) {
    return 0;
  }

  const remainingVolume = spaces.reduce((sum, space) => {
    return sum + Math.max(0, usableVolumeM3 - totalBlockVolumeM3(space.blocks));
  }, 0);

  return Math.floor(remainingVolume / templateVolumeM3);
}

function calculateAverageUtilization(spaces: PackedSpace[]) {
  if (spaces.length === 0) {
    return 0;
  }

  return roundRate(spaces.reduce((sum, space) => sum + space.utilizationRate, 0) / spaces.length);
}

function totalBlockVolumeM3(blocks: PackedBlock[]) {
  return blocks.reduce(
    (sum, block) => sum + dimensionsVolumeM3({ widthMm: block.widthMm, depthMm: block.depthMm, heightMm: block.heightMm }),
    0
  );
}

function dimensionsVolumeM3(dimensions: PlacementBounds) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundRate(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clonePackedSpaces(spaces: PackedSpace[]): PackedSpace[] {
  return spaces.map((space) => ({
    ...space,
    blocks: space.blocks.map((block) => ({ ...block }))
  }));
}
