import {
  APP_VERSION,
  TetrisWorkspace,
  TRUCK_PRESET_DISPLAY_NAME,
  WORKSPACE_SCHEMA_VERSION
} from "./types";

interface WorkspaceFactoryOptions {
  deviceId?: string;
  fileId?: string;
  now?: string;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function createDefaultWorkspace(options: WorkspaceFactoryOptions = {}): TetrisWorkspace {
  const now = options.now ?? new Date().toISOString();

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    fileId: options.fileId ?? createId("file"),
    revision: 1,
    deviceId: options.deviceId ?? createId("device"),
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    policy: {
      fragileStackOnFragileAllowed: true,
      truckPresetDisplayName: TRUCK_PRESET_DISPLAY_NAME
    },
    spaces: [],
    blockTemplates: [],
    draft: {
      selectedSpaceId: "preset-pallet-1150",
      blockItems: [],
      currentStep: "space",
      updatedAt: now
    },
    recentResults: [],
    chainHistory: []
  };
}

export function touchWorkspace(workspace: TetrisWorkspace, now = new Date().toISOString()) {
  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: now,
    draft: {
      ...workspace.draft,
      updatedAt: now
    }
  };
}
