import { SpaceDefinition, TRUCK_PRESET_DISPLAY_NAME } from "./types";

const PRESET_TIMESTAMP = "2026-06-08T00:00:00.000Z";
export const DEFAULT_PALLET_SPACE_ID = "preset-pallet-basic";
export const OVERHANG_PALLET_SPACE_ID = "preset-pallet-overhang";
const LEGACY_PALLET_SPACE_ID = "preset-pallet-1150";
const PRESET_SPACE_ID_ALIASES: Record<string, string> = {
  [LEGACY_PALLET_SPACE_ID]: DEFAULT_PALLET_SPACE_ID
};

export const PRESET_SPACES: SpaceDefinition[] = [
  {
    spaceId: DEFAULT_PALLET_SPACE_ID,
    entityVersion: 1,
    name: "기본 파레트",
    type: "pallet",
    dimensions: { widthMm: 1100, depthMm: 1100, heightMm: 1550 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    source: "현장 피드백 입고 가능 실제 사이즈",
    verifiedAt: "2026-06-10",
    isPreset: true,
    createdAt: PRESET_TIMESTAMP,
    updatedAt: PRESET_TIMESTAMP
  },
  {
    spaceId: OVERHANG_PALLET_SPACE_ID,
    entityVersion: 1,
    name: "오버행 파레트",
    type: "pallet",
    dimensions: { widthMm: 1150, depthMm: 1150, heightMm: 1550 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    source: "현장 피드백 공격 적재 검토 사이즈",
    verifiedAt: "2026-06-10",
    isPreset: true,
    createdAt: PRESET_TIMESTAMP,
    updatedAt: PRESET_TIMESTAMP
  },
  {
    spaceId: "preset-container-20ft-gp",
    entityVersion: 1,
    name: "20ft GP",
    type: "container",
    dimensions: { widthMm: 5900, depthMm: 2352, heightMm: 2393 },
    offset: { widthMm: 100, depthMm: 100, heightMm: 100 },
    source: "Hapag-Lloyd 예시치",
    verifiedAt: "2026-06-08",
    isPreset: true,
    createdAt: PRESET_TIMESTAMP,
    updatedAt: PRESET_TIMESTAMP
  },
  {
    spaceId: "preset-truck-2_5-ton-class",
    entityVersion: 1,
    name: TRUCK_PRESET_DISPLAY_NAME,
    type: "truck",
    dimensions: { widthMm: 4340, depthMm: 1960, heightMm: 380 },
    offset: { widthMm: 80, depthMm: 80, heightMm: 0 },
    source: "Hyundai Mighty 카탈로그 예시치",
    verifiedAt: "2026-06-08",
    isPreset: true,
    createdAt: PRESET_TIMESTAMP,
    updatedAt: PRESET_TIMESTAMP
  }
];

export function calculateUsableSize(space: SpaceDefinition) {
  return {
    widthMm: space.dimensions.widthMm - space.offset.widthMm,
    depthMm: space.dimensions.depthMm - space.offset.depthMm,
    heightMm: space.dimensions.heightMm - space.offset.heightMm
  };
}

export function normalizePresetSpaceId(spaceId: string | null) {
  return spaceId ? (PRESET_SPACE_ID_ALIASES[spaceId] ?? spaceId) : null;
}

export function findPresetSpaceById(spaceId: string | null) {
  const normalizedSpaceId = normalizePresetSpaceId(spaceId);
  return PRESET_SPACES.find((space) => space.spaceId === normalizedSpaceId);
}
