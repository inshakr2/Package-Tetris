import { BlockDefinition, PackedBlock, PackedSpace, SpaceDefinition } from "./types";

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

export interface OptimizationOutput {
  runId: string;
  usedSpaceCount: number;
  averageUtilizationRate: number;
  unloadedBlockCount: number;
  spaces: PackedSpace[];
  warnings: string[];
}
