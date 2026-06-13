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
const SAME_LAYER_FOLLOW_UP_LOOKAHEAD_LIMIT = 3;

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

  const candidates = rotations.flatMap((rotation) => {
    const xCandidates = createAxisCandidates(blocks, "xMm", "widthMm", usableSize.widthMm, rotation.widthMm);
    const yCandidates = createAxisCandidates(blocks, "yMm", "depthMm", usableSize.depthMm, rotation.depthMm);
    const zCandidates = createAxisCandidates(blocks, "zMm", "heightMm", usableSize.heightMm, rotation.heightMm);

    return zCandidates.flatMap((zMm) =>
      yCandidates.flatMap((yMm) =>
        xCandidates.map((xMm) => ({
          ...rotation,
          xMm,
          yMm,
          zMm
        }))
      )
    );
  });

  const viableCandidates = candidates
    .filter((candidate) => canPlaceAt(blocks, fragile, candidate, usableSize, policy))
    .sort(comparePositionCoordinates);
  const firstPosition = viableCandidates[0];

  if (!firstPosition) {
    return null;
  }

  const firstPositionCandidates = viableCandidates
    .filter((candidate) => comparePositionCoordinates(firstPosition, candidate) === 0)
    .map((candidate) => {
      const preservesInputLayer = preservesInputLayerFootprint(candidate, dimensions);

      return {
        candidate,
        preservesInputLayer,
        sameLayerFollowUpCount: preservesInputLayer
          ? countSameLayerFollowUpPlacements(blocks, dimensions, fragile, usableSize, policy, candidate)
          : -1
      };
    });

  return firstPositionCandidates.sort((left, right) => {
    if (left.preservesInputLayer !== right.preservesInputLayer) {
      return left.preservesInputLayer ? -1 : 1;
    }

    if (left.sameLayerFollowUpCount !== right.sameLayerFollowUpCount) {
      return right.sameLayerFollowUpCount - left.sameLayerFollowUpCount;
    }

    return left.candidate.rotation.localeCompare(right.candidate.rotation);
  })[0].candidate;
}

function comparePositionCoordinates(left: PositionCandidate, right: PositionCandidate) {
  if (left.zMm !== right.zMm) {
    return left.zMm - right.zMm;
  }

  if (left.yMm !== right.yMm) {
    return left.yMm - right.yMm;
  }

  return left.xMm - right.xMm;
}

function preservesInputLayerFootprint(
  candidate: PositionCandidate,
  dimensions: { widthMm: number; depthMm: number; heightMm: number }
) {
  return (
    candidate.heightMm === dimensions.heightMm &&
    candidate.widthMm * candidate.depthMm === dimensions.widthMm * dimensions.depthMm
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
  sizeKey: "widthMm" | "depthMm" | "heightMm",
  usableAxisSize: number,
  candidateAxisSize: number
) {
  const maxOffset = usableAxisSize - candidateAxisSize;

  return Array.from(
    new Set([
      0,
      maxOffset,
      ...blocks.flatMap((block) => {
        const blockStart = block[offsetKey];
        const blockEnd = block[offsetKey] + block[sizeKey];

        return [blockStart, blockEnd, blockStart - candidateAxisSize, blockEnd - candidateAxisSize];
      })
    ])
  )
    .filter((value) => value >= 0 && value <= maxOffset)
    .sort((left, right) => left - right);
}

function countSameLayerFollowUpPlacements(
  blocks: PackedBlock[],
  dimensions: { widthMm: number; depthMm: number; heightMm: number },
  fragile: boolean,
  usableSize: PlacementBounds,
  policy: PlacementPolicy,
  candidate: PositionCandidate
) {
  const simulatedBlocks = [...blocks, createTemporaryPackedBlock(candidate, fragile)];
  const rotations = createRotationCandidates(dimensions, usableSize);
  let followUpCount = 0;

  while (followUpCount < SAME_LAYER_FOLLOW_UP_LOOKAHEAD_LIMIT) {
    const nextPlacement = findSameLayerFollowUpPlacement(
      simulatedBlocks,
      rotations,
      fragile,
      usableSize,
      policy,
      candidate.zMm,
      candidate.heightMm
    );

    if (!nextPlacement) {
      return followUpCount;
    }

    simulatedBlocks.push(createTemporaryPackedBlock(nextPlacement, fragile));
    followUpCount += 1;
  }

  return followUpCount;
}

function findSameLayerFollowUpPlacement(
  blocks: PackedBlock[],
  rotations: RotationCandidate[],
  fragile: boolean,
  usableSize: PlacementBounds,
  policy: PlacementPolicy,
  zMm: number,
  heightMm: number
) {
  const candidates = rotations.flatMap((rotation) => {
    if (rotation.heightMm !== heightMm) {
      return [];
    }

    const xCandidates = createAxisCandidates(blocks, "xMm", "widthMm", usableSize.widthMm, rotation.widthMm);
    const yCandidates = createAxisCandidates(blocks, "yMm", "depthMm", usableSize.depthMm, rotation.depthMm);

    return yCandidates.flatMap((yMm) =>
      xCandidates.map((xMm) => ({
        ...rotation,
        xMm,
        yMm,
        zMm
      }))
    );
  });

  return (
    candidates
      .filter((candidate) => canPlaceAt(blocks, fragile, candidate, usableSize, policy))
      .sort((left, right) => comparePositionCoordinates(left, right) || left.rotation.localeCompare(right.rotation))[0] ??
    null
  );
}

function createTemporaryPackedBlock(candidate: PositionCandidate, fragile: boolean): PackedBlock {
  return {
    blockId: "__candidate__",
    blockTemplateId: "__candidate_template__",
    name: "후보 박스",
    fragile,
    xMm: candidate.xMm,
    yMm: candidate.yMm,
    zMm: candidate.zMm,
    widthMm: candidate.widthMm,
    depthMm: candidate.depthMm,
    heightMm: candidate.heightMm,
    rotation: candidate.rotation
  };
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
