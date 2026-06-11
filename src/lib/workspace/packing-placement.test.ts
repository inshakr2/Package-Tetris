import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPlaceAt, type PlacementBounds, type PositionCandidate } from "./packing-placement";
import { PackedBlock } from "./types";

const USABLE_SIZE: PlacementBounds = { widthMm: 1000, depthMm: 1000, heightMm: 1000 };
const FULL_SUPPORT_POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const
};
const PARTIAL_SUPPORT_POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const,
  partialSupportEnabled: true,
  minimumSupportRatio: 0.55
};

describe("packing-placement", () => {
  it("부분 지지 허용 OFF에서는 55% 이상 받침면이어도 전체 지지면이 아니면 배치하지 않는다", () => {
    // Given
    const blocks = [createPackedBlock({ widthMm: 600, depthMm: 1000 })];
    const candidate = createCandidate();

    // When
    const canPlace = canPlaceAt(blocks, false, candidate, USABLE_SIZE, FULL_SUPPORT_POLICY);

    // Then
    assert.equal(canPlace, false);
  });

  it("부분 지지 허용 ON에서는 받침면이 55% 이상이면 배치한다", () => {
    // Given
    const blocks = [createPackedBlock({ widthMm: 600, depthMm: 1000 })];
    const candidate = createCandidate();

    // When
    const canPlace = canPlaceAt(blocks, false, candidate, USABLE_SIZE, PARTIAL_SUPPORT_POLICY);

    // Then
    assert.equal(canPlace, true);
  });

  it("부분 지지 허용 ON인데 지지율 값이 누락되면 55% 기준으로 배치한다", () => {
    // Given
    const blocks = [createPackedBlock({ widthMm: 600, depthMm: 1000 })];
    const candidate = createCandidate();

    // When
    const canPlace = canPlaceAt(blocks, false, candidate, USABLE_SIZE, {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      partialSupportEnabled: true
    });

    // Then
    assert.equal(canPlace, true);
  });

  it("부분 지지 허용 ON이어도 받침면이 55%보다 작으면 배치하지 않는다", () => {
    // Given
    const blocks = [createPackedBlock({ widthMm: 549, depthMm: 1000 })];
    const candidate = createCandidate();

    // When
    const canPlace = canPlaceAt(blocks, false, candidate, USABLE_SIZE, PARTIAL_SUPPORT_POLICY);

    // Then
    assert.equal(canPlace, false);
  });

  it("부분 지지 허용 ON이어도 non-fragile은 fragile 지지면 위에 배치하지 않는다", () => {
    // Given
    const blocks = [createPackedBlock({ fragile: true, widthMm: 1000, depthMm: 1000 })];
    const candidate = createCandidate();

    // When
    const canPlace = canPlaceAt(blocks, false, candidate, USABLE_SIZE, PARTIAL_SUPPORT_POLICY);

    // Then
    assert.equal(canPlace, false);
  });

  it("지지 블록끼리 겹치는 비정상 입력은 겹친 면적을 중복 계산하지 않는다", () => {
    // Given
    const blocks = [
      createPackedBlock({ blockId: "support-left", xMm: 0, widthMm: 600, depthMm: 1000 }),
      createPackedBlock({ blockId: "support-right", xMm: 300, widthMm: 600, depthMm: 1000 })
    ];
    const candidate = createCandidate();

    // When
    const canPlace = canPlaceAt(blocks, false, candidate, USABLE_SIZE, FULL_SUPPORT_POLICY);

    // Then
    assert.equal(canPlace, false);
  });
});

function createPackedBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "support",
    blockTemplateId: "template-support",
    name: "받침 박스",
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 500,
    depthMm: 500,
    heightMm: 500,
    rotation: "xyz",
    ...overrides
  };
}

function createCandidate(overrides: Partial<PositionCandidate> = {}): PositionCandidate {
  return {
    rotation: "xyz",
    xMm: 0,
    yMm: 0,
    zMm: 500,
    widthMm: 1000,
    depthMm: 1000,
    heightMm: 500,
    ...overrides
  };
}
