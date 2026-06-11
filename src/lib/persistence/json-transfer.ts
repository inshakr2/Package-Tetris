import {
  APP_VERSION,
  BlockGroup,
  BlockTemplate,
  ChainHistoryItem,
  DEFAULT_MINIMUM_SUPPORT_RATIO,
  DraftState,
  ImportConflict,
  PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO,
  ResultSummary,
  SpaceDefinition,
  SUPPORTED_WORKSPACE_SCHEMA_VERSIONS,
  TetrisWorkspace,
  TRUCK_PRESET_DISPLAY_NAME,
  WORKSPACE_SCHEMA_VERSION
} from "../workspace/types";
import { deriveBlockGroupsFromTemplates } from "../workspace/block-groups";
import {
  normalizeChainHistory,
  normalizeRecentResults,
  normalizeWorkspace
} from "../workspace/workspace-migration";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

interface CopyOptions {
  deviceId: string;
  fileId: string;
  now: string;
}

interface WorkspaceExportPayload {
  schema_version: number;
  app_version: string;
  exported_at: string;
  device_id: string;
  file_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
  policy: {
    fragile_stack_on_fragile_allowed: boolean;
    partial_support_enabled: boolean;
    minimum_support_ratio: number;
    truck_preset_display_name: string;
  };
  custom_spaces: SpaceDefinition[];
  block_groups: BlockGroup[];
  custom_blocks: BlockTemplate[];
  draft: DraftState;
  recent_results: ResultSummary[];
  chain_history: ChainHistoryItem[];
}

export function exportWorkspaceToJson(
  workspace: TetrisWorkspace,
  exportedAt = new Date().toISOString()
) {
  const payload: WorkspaceExportPayload = {
    schema_version: workspace.schemaVersion,
    app_version: workspace.appVersion,
    exported_at: exportedAt,
    device_id: workspace.deviceId,
    file_id: workspace.fileId,
    revision: workspace.revision,
    created_at: workspace.createdAt,
    updated_at: workspace.updatedAt,
    policy: {
      fragile_stack_on_fragile_allowed: workspace.policy.fragileStackOnFragileAllowed,
      partial_support_enabled: workspace.policy.partialSupportEnabled,
      minimum_support_ratio: workspace.policy.minimumSupportRatio,
      truck_preset_display_name: workspace.policy.truckPresetDisplayName
    },
    custom_spaces: workspace.spaces,
    block_groups: deriveBlockGroupsFromTemplates(
      workspace.blockTemplates,
      workspace.blockGroups ?? [],
      exportedAt
    ),
    custom_blocks: workspace.blockTemplates,
    draft: workspace.draft,
    recent_results: normalizeRecentResults(workspace.recentResults, exportedAt),
    chain_history: normalizeChainHistory(workspace.chainHistory, exportedAt)
  };

  return JSON.stringify(payload, null, 2);
}

export function parseWorkspaceImport(jsonText: string): TetrisWorkspace {
  const payload = parseJsonWithGuards(jsonText);

  if (!isRecord(payload)) {
    throw new Error("가져오기 파일은 JSON 객체여야 합니다.");
  }

  assertAllowedTopLevelKeys(payload);

  if (!isSupportedSchemaVersion(payload.schema_version)) {
    throw new Error(`지원하지 않는 schema_version입니다: ${String(payload.schema_version)}`);
  }

  if (!isRecord(payload.policy)) {
    throw new Error("policy 정보가 올바르지 않습니다.");
  }

  const blockMigration = migrateBlocks(payload.custom_blocks, payload.draft);
  const draft = requireDraft(payload.draft, blockMigration.legacyDraftItems);

  return normalizeWorkspace({
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    appVersion: asString(payload.app_version, APP_VERSION),
    fileId: requireString(payload.file_id, "file_id"),
    revision: requireNumber(payload.revision, "revision"),
    deviceId: requireString(payload.device_id, "device_id"),
    createdAt: requireString(payload.created_at, "created_at"),
    updatedAt: requireString(payload.updated_at, "updated_at"),
    lastExportedAt: asString(payload.exported_at, null),
    policy: {
      fragileStackOnFragileAllowed:
        typeof payload.policy.fragile_stack_on_fragile_allowed === "boolean"
          ? payload.policy.fragile_stack_on_fragile_allowed
          : true,
      partialSupportEnabled: Boolean(payload.policy.partial_support_enabled),
      minimumSupportRatio: normalizeSupportRatio(
        payload.policy.minimum_support_ratio,
        payload.policy.partial_support_enabled
          ? PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO
          : DEFAULT_MINIMUM_SUPPORT_RATIO
      ),
      truckPresetDisplayName: TRUCK_PRESET_DISPLAY_NAME
    },
    spaces: asArray<SpaceDefinition>(payload.custom_spaces),
    blockGroups: asArray<BlockGroup>(payload.block_groups),
    blockTemplates: blockMigration.blockTemplates,
    draft,
    recentResults: asArray<ResultSummary>(payload.recent_results),
    chainHistory: asArray<ChainHistoryItem>(payload.chain_history)
  } satisfies TetrisWorkspace);
}

export function detectImportConflict(
  localWorkspace: TetrisWorkspace,
  importedWorkspace: TetrisWorkspace
): ImportConflict {
  if (localWorkspace.fileId !== importedWorkspace.fileId) {
    return {
      kind: "different-file",
      options: ["replace", "open-copy", "cancel"]
    };
  }

  if (localWorkspace.revision !== importedWorkspace.revision) {
    return {
      kind: "same-file-revision-conflict",
      options: ["keep-current", "replace", "open-copy", "cancel"]
    };
  }

  return {
    kind: "same-file-no-conflict",
    options: ["replace", "cancel"]
  };
}

export function copyWorkspaceForNewFile(
  workspace: TetrisWorkspace,
  options: CopyOptions
): TetrisWorkspace {
  return {
    ...deepClone(workspace),
    fileId: options.fileId,
    deviceId: options.deviceId,
    revision: 1,
    updatedAt: options.now,
    lastExportedAt: null,
    draft: {
      ...workspace.draft,
      updatedAt: options.now
    }
  };
}

function parseJsonWithGuards(jsonText: string) {
  return JSON.parse(jsonText, (key, value) => {
    if (DANGEROUS_KEYS.has(key)) {
      throw new Error(`허용되지 않는 키가 포함되어 있습니다: ${key}`);
    }
    return value;
  }) as unknown;
}

function assertAllowedTopLevelKeys(payload: Record<string, unknown>) {
  const allowedKeys = new Set([
    "schema_version",
    "app_version",
    "exported_at",
    "device_id",
    "file_id",
    "revision",
    "created_at",
    "updated_at",
    "policy",
    "custom_spaces",
    "block_groups",
    "custom_blocks",
    "draft",
    "recent_results",
    "chain_history"
  ]);

  Object.keys(payload).forEach((key) => {
    if (!allowedKeys.has(key)) {
      throw new Error(`알 수 없는 top-level key입니다: ${key}`);
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fieldName} 값이 필요합니다.`);
  }
  return value;
}

function asString(value: unknown, fallback: string): string;
function asString(value: unknown, fallback: null): string | null;
function asString(value: unknown, fallback: string | null) {
  return typeof value === "string" ? value : fallback;
}

function requireNumber(value: unknown, fieldName: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${fieldName} 값이 필요합니다.`);
  }
  return value;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isSupportedSchemaVersion(value: unknown) {
  return SUPPORTED_WORKSPACE_SCHEMA_VERSIONS.some((version) => version === value);
}

function normalizeSupportRatio(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1
    ? value
    : fallback;
}

function requireDraft(value: unknown, fallbackBlockItems: DraftState["blockItems"] = []): DraftState {
  if (!isRecord(value)) {
    throw new Error("draft 정보가 올바르지 않습니다.");
  }

  return {
    selectedSpaceId: typeof value.selectedSpaceId === "string" ? value.selectedSpaceId : null,
    blockItems: Array.isArray(value.blockItems)
      ? value.blockItems.filter(isDraftBlockItem)
      : fallbackBlockItems,
    currentStep:
      value.currentStep === "space" ||
      value.currentStep === "blocks" ||
      value.currentStep === "review" ||
      value.currentStep === "result" ||
      value.currentStep === "chain"
        ? value.currentStep
        : "space",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}

function migrateBlocks(customBlocks: unknown, draft: unknown) {
  const items = asArray<Record<string, unknown>>(customBlocks);
  const legacyBlockIds =
    isRecord(draft) && Array.isArray(draft.blockIds)
      ? draft.blockIds.filter((id): id is string => typeof id === "string")
      : [];

  const legacyDraftItems: DraftState["blockItems"] = [];
  const blockTemplates: BlockTemplate[] = items.map((item, index) => {
    if (typeof item.blockTemplateId === "string") {
      return item as unknown as BlockTemplate;
    }

    const blockTemplateId =
      typeof item.blockId === "string" ? item.blockId : `legacy-template-${index + 1}`;
    const now = typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString();

    if (legacyBlockIds.includes(blockTemplateId) || typeof item.quantity === "number") {
      legacyDraftItems.push({
        draftBlockItemId: `legacy-item-${blockTemplateId}`,
        blockTemplateId,
        quantity: typeof item.quantity === "number" ? Math.max(1, item.quantity) : 1,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
        updatedAt: now
      });
    }

    return {
      blockTemplateId,
      entityVersion: typeof item.entityVersion === "number" ? item.entityVersion : 1,
      name: typeof item.name === "string" ? item.name : "가져온 블록",
      dimensions: isRecord(item.dimensions)
        ? {
            widthMm: Number(item.dimensions.widthMm ?? 1),
            depthMm: Number(item.dimensions.depthMm ?? 1),
            heightMm: Number(item.dimensions.heightMm ?? 1)
          }
        : { widthMm: 1, depthMm: 1, heightMm: 1 },
      fragile: Boolean(item.fragile),
      weightKg: typeof item.weightKg === "number" && Number.isFinite(item.weightKg) ? item.weightKg : null,
      group1: typeof item.group1 === "string" && item.group1.trim().length > 0 ? item.group1.trim() : undefined,
      group2: typeof item.group2 === "string" && item.group2.trim().length > 0 ? item.group2.trim() : undefined,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
      updatedAt: now
    };
  });

  return {
    blockTemplates,
    legacyDraftItems
  };
}

function isDraftBlockItem(value: unknown): value is DraftState["blockItems"][number] {
  return (
    isRecord(value) &&
    typeof value.draftBlockItemId === "string" &&
    typeof value.blockTemplateId === "string" &&
    typeof value.quantity === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
