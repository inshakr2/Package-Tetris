import { PackedBlock } from "./types";

export type RotationKey = PackedBlock["rotation"];

export interface PlacementBounds {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface PlacementPolicy {
  fragileStackOnFragileAllowed: boolean;
  nonFragileOnFragileAllowed: boolean;
}

export interface RotationCandidate {
  rotation: RotationKey;
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface PositionCandidate extends RotationCandidate {
  xMm: number;
  yMm: number;
  zMm: number;
}

const ROTATION_CANDIDATES: ReadonlyArray<{
  rotation: RotationKey;
  dimensions: ReadonlyArray<"widthMm" | "depthMm" | "heightMm">;
}> = [
  { rotation: "xyz", dimensions: ["widthMm", "depthMm", "heightMm"] },
  { rotation: "xzy", dimensions: ["widthMm", "heightMm", "depthMm"] },
  { rotation: "yxz", dimensions: ["depthMm", "widthMm", "heightMm"] },
  { rotation: "yzx", dimensions: ["depthMm", "heightMm", "widthMm"] },
  { rotation: "zxy", dimensions: ["heightMm", "widthMm", "depthMm"] },
  { rotation: "zyx", dimensions: ["heightMm", "depthMm", "widthMm"] }
];

export function createRotationCandidates(
  dimensions: { widthMm: number; depthMm: number; heightMm: number },
  usableSize: PlacementBounds
): RotationCandidate[] {
  const unique = new Map<string, RotationCandidate>();

  ROTATION_CANDIDATES.forEach(({ rotation, dimensions: keys }) => {
    const candidate = {
      rotation,
      widthMm: dimensions[keys[0]],
      depthMm: dimensions[keys[1]],
      heightMm: dimensions[keys[2]]
    };

    if (
      candidate.widthMm <= usableSize.widthMm &&
      candidate.depthMm <= usableSize.depthMm &&
      candidate.heightMm <= usableSize.heightMm
    ) {
      unique.set(`${candidate.widthMm}:${candidate.depthMm}:${candidate.heightMm}`, candidate);
    }
  });

  return Array.from(unique.values()).sort((left, right) => {
    const baseAreaDiff = right.widthMm * right.depthMm - left.widthMm * left.depthMm;

    if (baseAreaDiff !== 0) {
      return baseAreaDiff;
    }

    return left.heightMm - right.heightMm;
  });
}

export function findFirstStablePlacement(
  blocks: PackedBlock[],
  dimensions: { widthMm: number; depthMm: number; heightMm: number },
  fragile: boolean,
  usableSize: PlacementBounds,
  policy: PlacementPolicy
): PositionCandidate | null {
  const rotations = createRotationCandidates(dimensions, usableSize);
  const xCandidates = createAxisCandidates(blocks, "xMm", "widthMm");
  const yCandidates = createAxisCandidates(blocks, "yMm", "depthMm");
  const zCandidates = createAxisCandidates(blocks, "zMm", "heightMm");

  const candidates = rotations.flatMap((rotation) =>
    zCandidates.flatMap((zMm) =>
      yCandidates.flatMap((yMm) =>
        xCandidates.map((xMm) => ({
          ...rotation,
          xMm,
          yMm,
          zMm
        }))
      )
    )
  );

  return (
    candidates
      .filter((candidate) => canPlaceAt(blocks, fragile, candidate, usableSize, policy))
      .sort((left, right) => {
        if (left.zMm !== right.zMm) {
          return left.zMm - right.zMm;
        }

        if (left.yMm !== right.yMm) {
          return left.yMm - right.yMm;
        }

        if (left.xMm !== right.xMm) {
          return left.xMm - right.xMm;
        }

        return left.rotation.localeCompare(right.rotation);
      })[0] ?? null
  );
}

export function canPlaceAt(
  blocks: PackedBlock[],
  fragile: boolean,
  candidate: PositionCandidate,
  usableSize: PlacementBounds,
  policy: PlacementPolicy
) {
  if (!fitsWithinUsableSize(candidate, usableSize)) {
    return false;
  }

  if (blocks.some((block) => overlaps3d(block, candidate))) {
    return false;
  }

  return hasStableSupport(blocks, fragile, candidate, policy);
}

export function overlaps3d(block: PackedBlock, candidate: PositionCandidate) {
  return (
    rangesOverlap(block.xMm, block.xMm + block.widthMm, candidate.xMm, candidate.xMm + candidate.widthMm) &&
    rangesOverlap(block.yMm, block.yMm + block.depthMm, candidate.yMm, candidate.yMm + candidate.depthMm) &&
    rangesOverlap(block.zMm, block.zMm + block.heightMm, candidate.zMm, candidate.zMm + candidate.heightMm)
  );
}

function createAxisCandidates(
  blocks: PackedBlock[],
  offsetKey: "xMm" | "yMm" | "zMm",
  sizeKey: "widthMm" | "depthMm" | "heightMm"
) {
  return Array.from(new Set([0, ...blocks.flatMap((block) => [block[offsetKey], block[offsetKey] + block[sizeKey]])]))
    .filter((value) => value >= 0)
    .sort((left, right) => left - right);
}

function fitsWithinUsableSize(candidate: PositionCandidate, usableSize: PlacementBounds) {
  return (
    candidate.xMm + candidate.widthMm <= usableSize.widthMm &&
    candidate.yMm + candidate.depthMm <= usableSize.depthMm &&
    candidate.zMm + candidate.heightMm <= usableSize.heightMm
  );
}

function hasStableSupport(
  blocks: PackedBlock[],
  fragile: boolean,
  candidate: PositionCandidate,
  policy: PlacementPolicy
) {
  if (candidate.zMm === 0) {
    return true;
  }

  const supportBlocks = blocks.filter((block) => {
    return (
      block.zMm + block.heightMm === candidate.zMm &&
      rangesOverlap(block.xMm, block.xMm + block.widthMm, candidate.xMm, candidate.xMm + candidate.widthMm) &&
      rangesOverlap(block.yMm, block.yMm + block.depthMm, candidate.yMm, candidate.yMm + candidate.depthMm)
    );
  });

  if (supportBlocks.length === 0) {
    return false;
  }

  if (!fragile && !policy.nonFragileOnFragileAllowed && supportBlocks.some((block) => block.fragile)) {
    return false;
  }

  if (fragile && !policy.fragileStackOnFragileAllowed && supportBlocks.some((block) => block.fragile)) {
    return false;
  }

  const supportedArea = supportBlocks.reduce((sum, block) => {
    return sum + intersectionArea2d(block, candidate);
  }, 0);

  return supportedArea >= candidate.widthMm * candidate.depthMm;
}

function intersectionArea2d(block: PackedBlock, candidate: PositionCandidate) {
  const width =
    Math.min(block.xMm + block.widthMm, candidate.xMm + candidate.widthMm) - Math.max(block.xMm, candidate.xMm);
  const depth =
    Math.min(block.yMm + block.depthMm, candidate.yMm + candidate.depthMm) - Math.max(block.yMm, candidate.yMm);

  return Math.max(0, width) * Math.max(0, depth);
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) {
  return leftStart < rightEnd && rightStart < leftEnd;
}
