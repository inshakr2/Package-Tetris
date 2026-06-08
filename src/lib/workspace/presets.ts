import { SpaceDefinition, TRUCK_PRESET_DISPLAY_NAME } from "./types";

const PRESET_TIMESTAMP = "2026-06-08T00:00:00.000Z";

export const PRESET_SPACES: SpaceDefinition[] = [
  {
    spaceId: "preset-pallet-1150",
    entityVersion: 1,
    name: "파레트 기본",
    type: "pallet",
    dimensions: { widthMm: 1150, depthMm: 1150, heightMm: 1550 },
    offset: { widthMm: 50, depthMm: 50, heightMm: 100 },
    source: "요구사항 내부 기준",
    verifiedAt: "2026-06-08",
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
