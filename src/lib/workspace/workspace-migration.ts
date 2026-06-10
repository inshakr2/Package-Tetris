import {
  APP_VERSION,
  BlockTemplate,
  DEFAULT_MINIMUM_SUPPORT_RATIO,
  DraftBlockItem,
  PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO,
  TetrisWorkspace,
  TRUCK_PRESET_DISPLAY_NAME,
  WORKSPACE_SCHEMA_VERSION
} from "./types";

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
    blockTemplates,
    draft: normalizeDraft(legacyWorkspace, blockTemplates, now),
    recentResults: Array.isArray(legacyWorkspace.recentResults) ? legacyWorkspace.recentResults : [],
    chainHistory: Array.isArray(legacyWorkspace.chainHistory) ? legacyWorkspace.chainHistory : []
  };
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
    selectedSpaceId: typeof draft.selectedSpaceId === "string" ? draft.selectedSpaceId : null,
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
    loadPriority: normalizeNullableNumber(item.loadPriority)
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

function normalizeSupportRatio(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1
    ? value
    : fallback;
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
