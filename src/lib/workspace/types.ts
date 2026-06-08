export const WORKSPACE_SCHEMA_VERSION = 1;
export const APP_VERSION = "0.1.0";
export const TRUCK_PRESET_DISPLAY_NAME = "2.5톤반";

export type SpaceType = "pallet" | "container" | "truck" | "custom";
export type StepKey = "space" | "blocks" | "review" | "result" | "chain";

export interface Dimensions {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface Offset {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface SpaceDefinition {
  spaceId: string;
  entityVersion: number;
  name: string;
  type: SpaceType;
  dimensions: Dimensions;
  offset: Offset;
  source?: string;
  verifiedAt?: string;
  isPreset?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlockTemplate {
  blockTemplateId: string;
  entityVersion: number;
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DraftBlockItem {
  draftBlockItemId: string;
  blockTemplateId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockDefinition {
  blockId: string;
  blockTemplateId: string;
  draftBlockItemId: string;
  entityVersion: number;
  name: string;
  dimensions: Dimensions;
  quantity: number;
  fragile: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackedBlock {
  blockId: string;
  blockTemplateId: string;
  name: string;
  fragile: boolean;
  xMm: number;
  yMm: number;
  zMm: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  rotation: "xyz" | "xzy" | "yxz" | "yzx" | "zxy" | "zyx";
}

export interface PackedSpace {
  spaceInstanceId: string;
  utilizationRate: number;
  blocks: PackedBlock[];
}

export interface DraftState {
  selectedSpaceId: string | null;
  blockItems: DraftBlockItem[];
  currentStep: StepKey;
  updatedAt: string;
}

export interface ResultSummary {
  resultId: string;
  runId?: string;
  createdAt: string;
  usedSpaceCount: number;
  averageUtilizationRate: number;
  unloadedBlockCount: number;
  spaces?: PackedSpace[];
  warnings?: string[];
}

export interface ChainHistoryItem {
  chainId: string;
  resultId: string;
  blockId: string;
  addedQuantity: number;
  createdAt: string;
}

export interface WorkspacePolicy {
  fragileStackOnFragileAllowed: boolean;
  truckPresetDisplayName: typeof TRUCK_PRESET_DISPLAY_NAME;
}

export interface TetrisWorkspace {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  appVersion: string;
  fileId: string;
  revision: number;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  lastExportedAt: string | null;
  policy: WorkspacePolicy;
  spaces: SpaceDefinition[];
  blockTemplates: BlockTemplate[];
  draft: DraftState;
  recentResults: ResultSummary[];
  chainHistory: ChainHistoryItem[];
}

export type ImportConflictKind =
  | "different-file"
  | "same-file-no-conflict"
  | "same-file-revision-conflict";

export type ImportConflictOption = "keep-current" | "replace" | "open-copy" | "cancel";

export interface ImportConflict {
  kind: ImportConflictKind;
  options: ImportConflictOption[];
}
