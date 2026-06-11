import {
  BlockDefinition,
  DEFAULT_MINIMUM_SUPPORT_RATIO,
  PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO,
  SpaceDefinition
} from "./types";

export type ResultFreshnessStatus = "fresh" | "stale" | "unknown";

interface ResultInputFingerprintInput {
  selectedSpace: SpaceDefinition | undefined;
  blocks: BlockDefinition[];
  fragileStackOnFragileAllowed: boolean;
  partialSupportEnabled?: boolean;
  minimumSupportRatio?: number;
}

interface ResultFreshnessStateInput {
  currentFingerprint: string | null;
  resultFingerprint: string | null | undefined;
  canCreateResult: boolean;
  disabledReason: string | null;
}

export interface ResultFreshnessState {
  status: ResultFreshnessStatus;
  visible: boolean;
  tone: "green" | "amber" | "neutral";
  title: string;
  description: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  ctaDisabledReason: string | null;
}

export function createResultInputFingerprint({
  selectedSpace,
  blocks,
  fragileStackOnFragileAllowed,
  partialSupportEnabled,
  minimumSupportRatio
}: ResultInputFingerprintInput): string | null {
  if (!selectedSpace) {
    return null;
  }

  return `result-input:v2:${JSON.stringify({
    policy: {
      fragileStackOnFragileAllowed,
      partialSupportEnabled: Boolean(partialSupportEnabled),
      minimumSupportRatio: normalizeMinimumSupportRatio(partialSupportEnabled, minimumSupportRatio)
    },
    space: {
      spaceId: selectedSpace.spaceId,
      entityVersion: selectedSpace.entityVersion,
      name: selectedSpace.name,
      type: selectedSpace.type,
      dimensions: selectedSpace.dimensions,
      offset: selectedSpace.offset
    },
    blocks: createNormalizedBlockInputs(blocks)
  })}`;
}

export function createResultFreshnessState({
  currentFingerprint,
  resultFingerprint,
  canCreateResult,
  disabledReason
}: ResultFreshnessStateInput): ResultFreshnessState {
  const ctaDisabled = !canCreateResult;
  const ctaDisabledReason = ctaDisabled ? disabledReason : null;

  if (!currentFingerprint || !resultFingerprint) {
    return {
      status: "unknown",
      visible: false,
      tone: "neutral",
      title: "결과 기준 확인 중",
      description: "이전 작업본의 결과는 입력 기준을 자동 판정하지 않습니다.",
      ctaLabel: "결과 다시 만들기",
      ctaDisabled,
      ctaDisabledReason
    };
  }

  if (currentFingerprint === resultFingerprint) {
    return {
      status: "fresh",
      visible: false,
      tone: "green",
      title: "현재 입력 기준 결과",
      description: "지금 결과는 현재 공간과 박스 기준입니다.",
      ctaLabel: "결과 다시 만들기",
      ctaDisabled,
      ctaDisabledReason
    };
  }

  return {
    status: "stale",
    visible: true,
    tone: "amber",
    title: "입력이 바뀌었습니다",
    description: "지금 결과는 이전 입력 기준입니다. 최신 박스와 공간으로 다시 계산하세요.",
    ctaLabel: "결과 다시 만들기",
    ctaDisabled,
    ctaDisabledReason
  };
}

function normalizeMinimumSupportRatio(partialSupportEnabled: unknown, value: unknown) {
  if (!partialSupportEnabled) {
    return DEFAULT_MINIMUM_SUPPORT_RATIO;
  }

  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1
    ? value
    : PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO;
}

function createNormalizedBlockInputs(blocks: BlockDefinition[]) {
  const blockMap = new Map<
    string,
    {
      blockTemplateId: string;
      entityVersion: number;
      name: string;
      dimensions: BlockDefinition["dimensions"];
      fragile: boolean;
      loadPriority: number;
      quantity: number;
    }
  >();

  blocks.forEach((block) => {
    const key = JSON.stringify({
      blockTemplateId: block.blockTemplateId,
      entityVersion: block.entityVersion,
      name: block.name,
      dimensions: block.dimensions,
      fragile: block.fragile,
      loadPriority: normalizeLoadPriority(block.loadPriority)
    });
    const existing = blockMap.get(key);

    if (existing) {
      existing.quantity += block.quantity;
      return;
    }

    blockMap.set(key, {
      blockTemplateId: block.blockTemplateId,
      entityVersion: block.entityVersion,
      name: block.name,
      dimensions: block.dimensions,
      fragile: block.fragile,
      loadPriority: normalizeLoadPriority(block.loadPriority),
      quantity: block.quantity
    });
  });

  return Array.from(blockMap.values()).sort((left, right) => {
    const leftKey = `${left.blockTemplateId}:${left.entityVersion}:${left.name}:${left.loadPriority}`;
    const rightKey = `${right.blockTemplateId}:${right.entityVersion}:${right.name}:${right.loadPriority}`;

    return leftKey.localeCompare(rightKey);
  });
}

function normalizeLoadPriority(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
