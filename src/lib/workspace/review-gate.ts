import { calculateUsableSize } from "./presets";
import { OptimizationInput } from "./engine-contract";
import { BlockDefinition, ResultSummary, SpaceDefinition } from "./types";

type ReviewGateStatus = "valid" | "warning" | "error";
type ReviewGateMessageCode =
  | "space-required"
  | "usable-size-invalid"
  | "blocks-required"
  | "block-quantity-invalid"
  | "block-dimensions-invalid"
  | "block-does-not-fit"
  | "multi-space-likely";

export interface ReviewGateMessage {
  code: ReviewGateMessageCode;
  level: ReviewGateStatus;
  text: string;
}

export interface ReviewGateResult {
  status: ReviewGateStatus;
  cta: {
    disabled: boolean;
    disabledReason: string | null;
  };
  messages: ReviewGateMessage[];
  usableSize: { widthMm: number; depthMm: number; heightMm: number } | null;
  totals: {
    totalBlockCount: number;
    totalBlockVolumeM3: number;
    usableSpaceVolumeM3: number;
    minimumSpaceCountLowerBound: number;
  };
  preparedInput: Omit<OptimizationInput, "runId"> | null;
}

interface ReviewExecutionReadinessInput {
  selectedSpace: SpaceDefinition | undefined;
  blocks: BlockDefinition[];
  fragileStackOnFragileAllowed: boolean;
}

interface PlaceholderResultOptions {
  resultId: string;
  createdAt: string;
}

const ORTHOGONAL_ROTATIONS = [
  ["widthMm", "depthMm", "heightMm"],
  ["widthMm", "heightMm", "depthMm"],
  ["depthMm", "widthMm", "heightMm"],
  ["depthMm", "heightMm", "widthMm"],
  ["heightMm", "widthMm", "depthMm"],
  ["heightMm", "depthMm", "widthMm"]
] as const;

export function reviewExecutionReadiness({
  selectedSpace,
  blocks,
  fragileStackOnFragileAllowed
}: ReviewExecutionReadinessInput): ReviewGateResult {
  const messages: ReviewGateMessage[] = [];
  const usableSize = selectedSpace ? calculateUsableSize(selectedSpace) : null;
  const totalBlockCount = blocks.reduce((sum, block) => sum + block.quantity, 0);
  const totalBlockVolumeM3 = blocks.reduce((sum, block) => sum + calculateBlockVolumeM3(block), 0);
  const usableSpaceVolumeM3 = usableSize && hasPositiveDimensions(usableSize) ? dimensionsVolumeM3(usableSize) : 0;

  if (!selectedSpace) {
    messages.push({
      code: "space-required",
      level: "error",
      text: "적재 공간을 선택하세요."
    });
  }

  if (selectedSpace && (!usableSize || !hasPositiveDimensions(usableSize))) {
    messages.push({
      code: "usable-size-invalid",
      level: "error",
      text: "적재 가능 크기가 0보다 커야 합니다. 공간 치수와 안전 여유를 확인하세요."
    });
  }

  if (blocks.length === 0 || totalBlockCount < 1) {
    messages.push({
      code: "blocks-required",
      level: "error",
      text: "박스를 1개 이상 현재 작업에 추가하세요."
    });
  }

  const quantityInvalidBlocks = blocks.filter((block) => block.quantity < 1);
  if (quantityInvalidBlocks.length > 0) {
    messages.push({
      code: "block-quantity-invalid",
      level: "error",
      text: "모든 박스 수량은 1 이상이어야 합니다."
    });
  }

  const dimensionsInvalidBlocks = blocks.filter((block) => !hasPositiveDimensions(block.dimensions));
  if (dimensionsInvalidBlocks.length > 0) {
    messages.push({
      code: "block-dimensions-invalid",
      level: "error",
      text: "모든 박스 치수는 1mm 이상이어야 합니다."
    });
  }

  const blocksThatDoNotFit =
    usableSize && hasPositiveDimensions(usableSize)
      ? blocks.filter((block) => !canFitInsideUsableSize(block, usableSize))
      : [];

  if (blocksThatDoNotFit.length > 0) {
    messages.push({
      code: "block-does-not-fit",
      level: "error",
      text: `${blocksThatDoNotFit[0]?.name ?? "일부 박스"}은(는) 돌려 놓아도 선택한 공간의 적재 가능 크기에 들어가지 않습니다.`
    });
  }

  const minimumSpaceCountLowerBound =
    usableSpaceVolumeM3 > 0 ? Math.max(1, Math.ceil(totalBlockVolumeM3 / usableSpaceVolumeM3)) : 0;

  if (messages.length === 0 && minimumSpaceCountLowerBound > 1) {
    messages.push({
      code: "multi-space-likely",
      level: "warning",
      text: `총 부피 기준 최소 ${minimumSpaceCountLowerBound}개 공간이 필요할 수 있습니다.`
    });
  }

  const status = resolveStatus(messages);
  const preparedInput =
    status === "error" || !selectedSpace
      ? null
      : {
          space: selectedSpace,
          blocks,
          policy: {
            fragileStackOnFragileAllowed,
            nonFragileOnFragileAllowed: false as const,
            rotation: "orthogonal-90deg" as const
          }
        };

  return {
    status,
    cta: {
      disabled: status === "error",
      disabledReason: status === "error" ? messages.find((message) => message.level === "error")?.text ?? null : null
    },
    messages,
    usableSize,
    totals: {
      totalBlockCount,
      totalBlockVolumeM3,
      usableSpaceVolumeM3,
      minimumSpaceCountLowerBound
    },
    preparedInput
  };
}

export function createOptimizationInput(review: ReviewGateResult, runId: string): OptimizationInput | null {
  if (!review.preparedInput) {
    return null;
  }

  return {
    runId,
    ...review.preparedInput
  };
}

export function createPlaceholderResultSummary(
  review: ReviewGateResult,
  options: PlaceholderResultOptions
): ResultSummary | null {
  if (!review.preparedInput) {
    return null;
  }

  const usedSpaceCount = Math.max(1, review.totals.minimumSpaceCountLowerBound);
  const averageUtilizationRate =
    review.totals.usableSpaceVolumeM3 > 0
      ? Number(
          (
            review.totals.totalBlockVolumeM3 /
            (review.totals.usableSpaceVolumeM3 * usedSpaceCount)
          ).toFixed(3)
        )
      : 0;

  return {
    resultId: options.resultId,
    createdAt: options.createdAt,
    usedSpaceCount,
    averageUtilizationRate,
    unloadedBlockCount: 0
  };
}

function resolveStatus(messages: ReviewGateMessage[]): ReviewGateStatus {
  if (messages.some((message) => message.level === "error")) {
    return "error";
  }

  if (messages.some((message) => message.level === "warning")) {
    return "warning";
  }

  return "valid";
}

function canFitInsideUsableSize(
  block: BlockDefinition,
  usableSize: { widthMm: number; depthMm: number; heightMm: number }
) {
  return ORTHOGONAL_ROTATIONS.some(([widthKey, depthKey, heightKey]) => {
    return (
      block.dimensions[widthKey] <= usableSize.widthMm &&
      block.dimensions[depthKey] <= usableSize.depthMm &&
      block.dimensions[heightKey] <= usableSize.heightMm
    );
  });
}

function hasPositiveDimensions(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return dimensions.widthMm > 0 && dimensions.depthMm > 0 && dimensions.heightMm > 0;
}

function calculateBlockVolumeM3(block: BlockDefinition) {
  return dimensionsVolumeM3(block.dimensions) * block.quantity;
}

function dimensionsVolumeM3(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}
