import {
  APP_VERSION,
  BlockTemplate,
  ChainHistoryItem,
  DEFAULT_MINIMUM_SUPPORT_RATIO,
  DraftBlockItem,
  PackedBlock,
  PackedSpace,
  PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO,
  ResultSummary,
  SpaceDefinition,
  SpaceType,
  TetrisWorkspace,
  TRUCK_PRESET_DISPLAY_NAME,
  WORKSPACE_SCHEMA_VERSION
} from "./types";
import { normalizePresetSpaceId } from "./presets";
import { normalizeBlockGroups } from "./block-groups";
import { normalizeLoadPriority } from "./load-priority";

type LegacyWorkspace = Partial<TetrisWorkspace> & {
  blocks?: Array<Partial<BlockTemplate> & { blockId?: string; quantity?: number }>;
  draft?: Partial<TetrisWorkspace["draft"]> & { blockIds?: string[] };
};

export function normalizeWorkspace(workspace: TetrisWorkspace): TetrisWorkspace {
  const legacyWorkspace = workspace as LegacyWorkspace;
  const now = asString(legacyWorkspace.updatedAt, new Date().toISOString());
  const blockTemplates = normalizeBlockTemplates(
    legacyWorkspace.blockTemplates ?? legacyWorkspace.blocks ?? [],
    now
  );
  const blockGroups = normalizeBlockGroups(legacyWorkspace.blockGroups ?? [], blockTemplates, now);

  return {
    ...workspace,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    appVersion: asString(legacyWorkspace.appVersion, APP_VERSION),
    fileId: asString(legacyWorkspace.fileId, "file-imported"),
    revision: typeof legacyWorkspace.revision === "number" ? legacyWorkspace.revision : 1,
    deviceId: asString(legacyWorkspace.deviceId, "device-imported"),
    createdAt: asString(legacyWorkspace.createdAt, now),
    updatedAt: now,
    lastExportedAt:
      typeof legacyWorkspace.lastExportedAt === "string" || legacyWorkspace.lastExportedAt === null
        ? legacyWorkspace.lastExportedAt
        : null,
    policy: normalizeWorkspacePolicy(legacyWorkspace.policy),
    spaces: Array.isArray(legacyWorkspace.spaces) ? legacyWorkspace.spaces : [],
    blockGroups,
    blockTemplates,
    draft: normalizeDraft(legacyWorkspace, blockTemplates, now),
    recentResults: normalizeRecentResults(legacyWorkspace.recentResults, now),
    chainHistory: normalizeChainHistory(legacyWorkspace.chainHistory, now)
  };
}

export function normalizeRecentResults(value: unknown, now = new Date().toISOString()): ResultSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => normalizeResultSummary(item, index, now));
}

export function normalizeChainHistory(value: unknown, now = new Date().toISOString()): ChainHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => normalizeChainHistoryItem(item, index, now));
}

function normalizeWorkspacePolicy(policy: LegacyWorkspace["policy"]): TetrisWorkspace["policy"] {
  const partialSupportEnabled = Boolean(policy?.partialSupportEnabled);

  return {
    fragileStackOnFragileAllowed:
      typeof policy?.fragileStackOnFragileAllowed === "boolean"
        ? policy.fragileStackOnFragileAllowed
        : true,
    partialSupportEnabled,
    minimumSupportRatio: normalizeSupportRatio(
      policy?.minimumSupportRatio,
      partialSupportEnabled ? PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO : DEFAULT_MINIMUM_SUPPORT_RATIO
    ),
    truckPresetDisplayName: TRUCK_PRESET_DISPLAY_NAME
  };
}

function normalizeBlockTemplates(items: unknown[], now: string): BlockTemplate[] {
  return items.map((item, index) => {
    const record = isRecord(item) ? item : {};
    const blockTemplateId =
      asString(record.blockTemplateId, null) ??
      asString(record.blockId, null) ??
      `legacy-template-${index + 1}`;

    return {
      blockTemplateId,
      entityVersion: typeof record.entityVersion === "number" ? record.entityVersion : 1,
      name: asString(record.name, "가져온 블록"),
      dimensions: normalizeDimensions(record.dimensions),
      fragile: Boolean(record.fragile),
      weightKg: normalizeNullableNumber(record.weightKg),
      group1: normalizeOptionalString(record.group1),
      group2: normalizeOptionalString(record.group2),
      createdAt: asString(record.createdAt, now),
      updatedAt: asString(record.updatedAt, now)
    };
  });
}

function normalizeResultSummary(value: unknown, index: number, now: string): ResultSummary {
  const record = isRecord(value) ? value : {};
  const result: ResultSummary = {
    resultId: asString(record.resultId, `result-imported-${index + 1}`),
    createdAt: asString(record.createdAt, now),
    usedSpaceCount: normalizeNonNegativeNumber(record.usedSpaceCount, 0),
    averageUtilizationRate: normalizeFiniteNumber(record.averageUtilizationRate, 0),
    unloadedBlockCount: normalizeNonNegativeNumber(record.unloadedBlockCount, 0)
  };
  const runId = normalizeOptionalString(record.runId);
  const inputFingerprint = normalizeOptionalString(record.inputFingerprint);

  if (runId) {
    result.runId = runId;
  }

  if (inputFingerprint) {
    result.inputFingerprint = inputFingerprint;
  }

  if (isRecord(record.spaceSnapshot)) {
    result.spaceSnapshot = normalizeSpaceDefinition(record.spaceSnapshot, now, `space-result-${index + 1}`);
  }

  if (Array.isArray(record.spaces)) {
    result.spaces = record.spaces.map((space, spaceIndex) => normalizePackedSpace(space, spaceIndex));
  }

  if (Array.isArray(record.warnings)) {
    result.warnings = record.warnings.filter((warning): warning is string => typeof warning === "string");
  }

  return result;
}

function normalizeChainHistoryItem(value: unknown, index: number, now: string): ChainHistoryItem {
  const record = isRecord(value) ? value : {};
  const item: ChainHistoryItem = {
    chainId: asString(record.chainId, `chain-imported-${index + 1}`),
    resultId: asString(record.resultId, `result-imported-${index + 1}`),
    blockId: asString(record.blockId, `block-imported-${index + 1}`),
    addedQuantity: normalizeNonNegativeNumber(record.addedQuantity, 0),
    createdAt: asString(record.createdAt, now)
  };
  const blockTemplateId = normalizeOptionalString(record.blockTemplateId);
  const blockName = normalizeOptionalString(record.blockName);

  if (blockTemplateId) {
    item.blockTemplateId = blockTemplateId;
  }

  if (blockName) {
    item.blockName = blockName;
  }

  if (Array.isArray(record.previousSpaces)) {
    item.previousSpaces = record.previousSpaces.map((space, spaceIndex) =>
      normalizePackedSpace(space, spaceIndex)
    );
  }

  if (typeof record.previousAverageUtilizationRate === "number") {
    item.previousAverageUtilizationRate = normalizeFiniteNumber(record.previousAverageUtilizationRate, 0);
  }

  return item;
}

function normalizeSpaceDefinition(
  value: Record<string, unknown>,
  now: string,
  fallbackSpaceId: string
): SpaceDefinition {
  const space: SpaceDefinition = {
    spaceId: asString(value.spaceId, fallbackSpaceId),
    entityVersion: normalizeNonNegativeNumber(value.entityVersion, 1),
    name: asString(value.name, "가져온 공간"),
    type: normalizeSpaceType(value.type),
    dimensions: normalizeDimensions(value.dimensions),
    offset: normalizeOffset(value.offset),
    createdAt: asString(value.createdAt, now),
    updatedAt: asString(value.updatedAt, now)
  };
  const source = normalizeOptionalString(value.source);
  const verifiedAt = normalizeOptionalString(value.verifiedAt);

  if (source) {
    space.source = source;
  }

  if (verifiedAt) {
    space.verifiedAt = verifiedAt;
  }

  if (typeof value.isPreset === "boolean") {
    space.isPreset = value.isPreset;
  }

  return space;
}

function normalizePackedSpace(value: unknown, index: number): PackedSpace {
  const record = isRecord(value) ? value : {};

  return {
    spaceInstanceId: asString(record.spaceInstanceId, `space-instance-imported-${index + 1}`),
    utilizationRate: normalizeFiniteNumber(record.utilizationRate, 0),
    blocks: Array.isArray(record.blocks)
      ? record.blocks.map((block, blockIndex) => normalizePackedBlock(block, blockIndex))
      : []
  };
}

function normalizePackedBlock(value: unknown, index: number): PackedBlock {
  const record = isRecord(value) ? value : {};

  return {
    blockId: asString(record.blockId, `block-imported-${index + 1}`),
    blockTemplateId: asString(record.blockTemplateId, `template-imported-${index + 1}`),
    name: asString(record.name, "가져온 박스"),
    fragile: Boolean(record.fragile),
    xMm: normalizeFiniteNumber(record.xMm, 0),
    yMm: normalizeFiniteNumber(record.yMm, 0),
    zMm: normalizeFiniteNumber(record.zMm, 0),
    widthMm: normalizeFiniteNumber(record.widthMm, 1),
    depthMm: normalizeFiniteNumber(record.depthMm, 1),
    heightMm: normalizeFiniteNumber(record.heightMm, 1),
    rotation: isPackedBlockRotation(record.rotation) ? record.rotation : "xyz"
  };
}

function normalizeDraft(
  workspace: LegacyWorkspace,
  blockTemplates: BlockTemplate[],
  now: string
): TetrisWorkspace["draft"] {
  const draft: Record<string, unknown> = isRecord(workspace.draft) ? workspace.draft : {};
  const legacyDraftItems = createLegacyDraftItems(workspace, blockTemplates, now);
  const blockItems = Array.isArray(draft.blockItems)
    ? draft.blockItems.filter(isDraftBlockItem).map((item: DraftBlockItem) => normalizeDraftBlockItem(item))
    : legacyDraftItems;

  return {
    selectedSpaceId:
      typeof draft.selectedSpaceId === "string" ? normalizePresetSpaceId(draft.selectedSpaceId) : null,
    blockItems,
    currentStep: normalizeStepKey(draft.currentStep),
    updatedAt: asString(draft.updatedAt, now)
  };
}

function createLegacyDraftItems(
  workspace: LegacyWorkspace,
  blockTemplates: BlockTemplate[],
  now: string
): DraftBlockItem[] {
  const draft: Record<string, unknown> = isRecord(workspace.draft) ? workspace.draft : {};
  const legacyBlockIds = Array.isArray(draft.blockIds)
    ? draft.blockIds.filter((blockId: unknown): blockId is string => typeof blockId === "string")
    : [];

  if (legacyBlockIds.length === 0) {
    return [];
  }

  return legacyBlockIds.map((blockId, index) => {
    const block = workspace.blocks?.find(
      (candidate) => candidate.blockId === blockId || candidate.blockTemplateId === blockId
    );
    const template = blockTemplates.find((candidate) => candidate.blockTemplateId === blockId);

    return {
      draftBlockItemId: `legacy-item-${blockId}-${index + 1}`,
      blockTemplateId: template?.blockTemplateId ?? blockId,
      quantity: typeof block?.quantity === "number" ? Math.max(1, block.quantity) : 1,
      loadPriority: null,
      createdAt: asString(block?.createdAt, now),
      updatedAt: asString(block?.updatedAt, now)
    };
  });
}

function normalizeDraftBlockItem(item: DraftBlockItem): DraftBlockItem {
  return {
    ...item,
    loadPriority: normalizeLoadPriority(item.loadPriority)
  };
}

function isDraftBlockItem(value: unknown): value is DraftBlockItem {
  return (
    isRecord(value) &&
    typeof value.draftBlockItemId === "string" &&
    typeof value.blockTemplateId === "string" &&
    typeof value.quantity === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function normalizeDimensions(value: unknown) {
  if (!isRecord(value)) {
    return { widthMm: 1, depthMm: 1, heightMm: 1 };
  }

  return {
    widthMm: Number(value.widthMm ?? 1),
    depthMm: Number(value.depthMm ?? 1),
    heightMm: Number(value.heightMm ?? 1)
  };
}

function normalizeOffset(value: unknown) {
  if (!isRecord(value)) {
    return { widthMm: 0, depthMm: 0, heightMm: 0 };
  }

  return {
    widthMm: Number(value.widthMm ?? 0),
    depthMm: Number(value.depthMm ?? 0),
    heightMm: Number(value.heightMm ?? 0)
  };
}

function normalizeSpaceType(value: unknown): SpaceType {
  return value === "pallet" || value === "container" || value === "truck" || value === "custom"
    ? value
    : "custom";
}

function normalizeSupportRatio(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1
    ? value
    : fallback;
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStepKey(value: unknown): TetrisWorkspace["draft"]["currentStep"] {
  return value === "space" ||
    value === "blocks" ||
    value === "review" ||
    value === "result" ||
    value === "chain"
    ? value
    : "space";
}

function asString(value: unknown, fallback: string): string;
function asString(value: unknown, fallback: null): string | null;
function asString(value: unknown, fallback: string | null) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPackedBlockRotation(value: unknown): value is PackedBlock["rotation"] {
  return (
    value === "xyz" ||
    value === "xzy" ||
    value === "yxz" ||
    value === "yzx" ||
    value === "zxy" ||
    value === "zyx"
  );
}
