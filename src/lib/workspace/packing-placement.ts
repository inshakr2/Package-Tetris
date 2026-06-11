import { PackedBlock, PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO } from "./types";

export type RotationKey = PackedBlock["rotation"];

export interface PlacementBounds {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface PlacementPolicy {
  fragileStackOnFragileAllowed: boolean;
  nonFragileOnFragileAllowed: boolean;
  partialSupportEnabled?: boolean;
  minimumSupportRatio?: number;
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
    candidate.xMm >= 0 &&
    candidate.yMm >= 0 &&
    candidate.zMm >= 0 &&
    candidate.widthMm > 0 &&
    candidate.depthMm > 0 &&
    candidate.heightMm > 0 &&
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

  const supportedArea = calculateSupportedArea(supportBlocks, candidate);
  const requiredSupportRatio = getRequiredSupportRatio(policy);

  return supportedArea >= candidate.widthMm * candidate.depthMm * requiredSupportRatio;
}

function getRequiredSupportRatio(policy: PlacementPolicy) {
  if (!policy.partialSupportEnabled) {
    return 1;
  }

  return typeof policy.minimumSupportRatio === "number" &&
    Number.isFinite(policy.minimumSupportRatio) &&
    policy.minimumSupportRatio > 0 &&
    policy.minimumSupportRatio <= 1
    ? policy.minimumSupportRatio
    : PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO;
}

function calculateSupportedArea(blocks: PackedBlock[], candidate: PositionCandidate) {
  const intersections = blocks
    .map((block) => createIntersectionRect(block, candidate))
    .filter((rect): rect is SupportRect => rect !== null);

  if (intersections.length === 0) {
    return 0;
  }

  const xEdges = Array.from(new Set(intersections.flatMap((rect) => [rect.xStart, rect.xEnd]))).sort(
    (left, right) => left - right
  );

  return xEdges.slice(0, -1).reduce((totalArea, xStart, index) => {
    const xEnd = xEdges[index + 1];

    if (xEnd === undefined || xEnd <= xStart) {
      return totalArea;
    }

    const activeYRanges = intersections
      .filter((rect) => rect.xStart < xEnd && xStart < rect.xEnd)
      .map((rect) => ({ start: rect.yStart, end: rect.yEnd }));

    return totalArea + (xEnd - xStart) * calculateUnionLength(activeYRanges);
  }, 0);
}

interface SupportRect {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
}

function createIntersectionRect(block: PackedBlock, candidate: PositionCandidate): SupportRect | null {
  const width =
    Math.min(block.xMm + block.widthMm, candidate.xMm + candidate.widthMm) - Math.max(block.xMm, candidate.xMm);
  const depth =
    Math.min(block.yMm + block.depthMm, candidate.yMm + candidate.depthMm) - Math.max(block.yMm, candidate.yMm);

  if (width <= 0 || depth <= 0) {
    return null;
  }

  return {
    xStart: Math.max(block.xMm, candidate.xMm),
    xEnd: Math.min(block.xMm + block.widthMm, candidate.xMm + candidate.widthMm),
    yStart: Math.max(block.yMm, candidate.yMm),
    yEnd: Math.min(block.yMm + block.depthMm, candidate.yMm + candidate.depthMm)
  };
}

function calculateUnionLength(ranges: Array<{ start: number; end: number }>) {
  const sortedRanges = ranges
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (sortedRanges.length === 0) {
    return 0;
  }

  let total = 0;
  let currentStart = sortedRanges[0]?.start ?? 0;
  let currentEnd = sortedRanges[0]?.end ?? 0;

  sortedRanges.slice(1).forEach((range) => {
    if (range.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, range.end);
      return;
    }

    total += currentEnd - currentStart;
    currentStart = range.start;
    currentEnd = range.end;
  });

  return total + currentEnd - currentStart;
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) {
  return leftStart < rightEnd && rightStart < leftEnd;
}
