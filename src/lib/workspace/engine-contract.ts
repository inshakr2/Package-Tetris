import { BlockDefinition, SpaceDefinition } from "./types";

export interface OptimizationInput {
  runId: string;
  space: SpaceDefinition;
  blocks: BlockDefinition[];
  policy: {
    fragileStackOnFragileAllowed: boolean;
    nonFragileOnFragileAllowed: false;
    rotation: "orthogonal-90deg";
  };
}

export interface PackedBlock {
  blockId: string;
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

export interface OptimizationOutput {
  runId: string;
  usedSpaceCount: number;
  averageUtilizationRate: number;
  unloadedBlockCount: number;
  spaces: PackedSpace[];
  warnings: string[];
}
