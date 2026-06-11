import { TetrisWorkspace } from "../workspace/types";

export type PersistenceState = "persisted" | "best-effort" | "denied" | "unsupported" | "error";
export type PersistenceRequestResult = "persisted" | "denied" | "unsupported" | "error";

export interface StorageManagerLike {
  estimate?: () => Promise<StorageEstimateLike>;
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

export interface StorageEstimateLike {
  usage?: number;
  quota?: number;
}

export interface StorageHealthSnapshot {
  persistenceState: PersistenceState;
  persistSupported: boolean;
  estimateSupported: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
  usageLabel: string | null;
  quotaLabel: string | null;
  usageRatio: number | null;
  usageRatioLabel: string | null;
  errorMessage: string | null;
}

interface StorageHealthSnapshotContext {
  persisted: boolean;
  persistSupported: boolean;
  estimateSupported: boolean;
  estimate?: StorageEstimateLike | null;
  requestResult?: PersistenceRequestResult | null;
  errorMessage?: string | null;
}

export function hasMeaningfulWorkspaceData(workspace: TetrisWorkspace) {
  return (
    workspace.spaces.length > 0 ||
    (workspace.blockGroups?.length ?? 0) > 0 ||
    workspace.blockTemplates.length > 0 ||
    workspace.draft.blockItems.length > 0 ||
    workspace.recentResults.length > 0 ||
    workspace.chainHistory.length > 0
  );
}

export function shouldRemindExport(workspace: TetrisWorkspace) {
  if (!hasMeaningfulWorkspaceData(workspace)) {
    return false;
  }

  if (!workspace.lastExportedAt) {
    return true;
  }

  return workspace.updatedAt > workspace.lastExportedAt;
}

export function formatStorageBytes(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(precision)}${units[unitIndex]}`;
}

export function createStorageHealthSnapshot(context: StorageHealthSnapshotContext): StorageHealthSnapshot {
  const usageBytes = normalizeStorageNumber(context.estimate?.usage);
  const quotaBytes = normalizeStorageNumber(context.estimate?.quota);
  const usageRatio = usageBytes !== null && quotaBytes !== null && quotaBytes > 0 ? usageBytes / quotaBytes : null;

  return {
    persistenceState: resolvePersistenceState(context),
    persistSupported: context.persistSupported,
    estimateSupported: context.estimateSupported,
    usageBytes,
    quotaBytes,
    usageLabel: formatStorageBytes(usageBytes),
    quotaLabel: formatStorageBytes(quotaBytes),
    usageRatio,
    usageRatioLabel: usageRatio !== null ? `${Math.round(usageRatio * 100)}%` : null,
    errorMessage: context.errorMessage ?? null
  };
}

export async function readStorageHealth(
  storage: StorageManagerLike | undefined,
  isSecureContext: boolean
): Promise<StorageHealthSnapshot> {
  if (!storage || !isSecureContext) {
    return createStorageHealthSnapshot({
      persisted: false,
      persistSupported: false,
      estimateSupported: false,
      estimate: null
    });
  }

  const persistSupported = typeof storage.persist === "function";
  const estimateSupported = typeof storage.estimate === "function";

  try {
    const [persisted, estimate] = await Promise.all([
      typeof storage.persisted === "function" ? storage.persisted() : Promise.resolve(false),
      typeof storage.estimate === "function" ? storage.estimate() : Promise.resolve(null)
    ]);

    return createStorageHealthSnapshot({
      persisted,
      persistSupported,
      estimateSupported,
      estimate
    });
  } catch (error) {
    return createStorageHealthSnapshot({
      persisted: false,
      persistSupported,
      estimateSupported,
      requestResult: "error",
      estimate: null,
      errorMessage: toErrorMessage(error)
    });
  }
}

export async function requestStoragePersistence(
  storage: StorageManagerLike | undefined,
  isSecureContext: boolean
): Promise<PersistenceRequestResult> {
  if (!storage || !isSecureContext || typeof storage.persist !== "function") {
    return "unsupported";
  }

  try {
    return (await storage.persist()) ? "persisted" : "denied";
  } catch {
    return "error";
  }
}

function resolvePersistenceState(context: StorageHealthSnapshotContext): PersistenceState {
  if (context.requestResult === "error") {
    return "error";
  }

  if (!context.persistSupported) {
    return "unsupported";
  }

  if (context.requestResult === "denied") {
    return "denied";
  }

  if (context.persisted || context.requestResult === "persisted") {
    return "persisted";
  }

  return "best-effort";
}

function normalizeStorageNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "브라우저 저장 상태를 확인하지 못했습니다.";
}
