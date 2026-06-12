import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPlaceAt, findFirstStablePlacement, type PlacementBounds, type PositionCandidate } from "./packing-placement";
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

  it("기존 박스 끝에서 후보 크기를 뺀 좌표를 사용해 바람개비 빈칸을 찾는다", () => {
    // Given
    const usableSize: PlacementBounds = { widthMm: 1100, depthMm: 1100, heightMm: 1550 };
    const blocks = [
      createPackedBlock({ blockId: "pinwheel-a", xMm: 0, yMm: 0, widthMm: 690, depthMm: 370, heightMm: 580 }),
      createPackedBlock({
        blockId: "pinwheel-b",
        xMm: 690,
        yMm: 0,
        widthMm: 370,
        depthMm: 690,
        heightMm: 580,
        rotation: "yxz"
      }),
      createPackedBlock({
        blockId: "pinwheel-c",
        xMm: 0,
        yMm: 370,
        widthMm: 370,
        depthMm: 690,
        heightMm: 580,
        rotation: "yxz"
      })
    ];

    // When
    const placement = findFirstStablePlacement(
      blocks,
      { widthMm: 690, depthMm: 370, heightMm: 580 },
      false,
      usableSize,
      FULL_SUPPORT_POLICY
    );

    // Then
    assert.deepEqual(placement && { xMm: placement.xMm, yMm: placement.yMm, zMm: placement.zMm }, {
      xMm: 370,
      yMm: 690,
      zMm: 0
    });
  });

  it("동일 높이와 바닥면 후보가 갈리면 다음 같은 층 배치를 남기는 회전을 고른다", () => {
    // Given
    const usableSize: PlacementBounds = { widthMm: 1100, depthMm: 1100, heightMm: 1550 };
    const blocks = [
      createPackedBlock({ blockId: "pinwheel-a", xMm: 0, yMm: 0, widthMm: 690, depthMm: 370, heightMm: 580 }),
      createPackedBlock({
        blockId: "pinwheel-b",
        xMm: 690,
        yMm: 0,
        widthMm: 370,
        depthMm: 690,
        heightMm: 580,
        rotation: "yxz"
      })
    ];

    // When
    const placement = findFirstStablePlacement(
      blocks,
      { widthMm: 690, depthMm: 370, heightMm: 580 },
      false,
      usableSize,
      FULL_SUPPORT_POLICY
    );

    // Then
    assert.deepEqual(
      placement && {
        rotation: placement.rotation,
        xMm: placement.xMm,
        yMm: placement.yMm,
        zMm: placement.zMm,
        widthMm: placement.widthMm,
        depthMm: placement.depthMm
      },
      {
        rotation: "yxz",
        xMm: 0,
        yMm: 370,
        zMm: 0,
        widthMm: 370,
        depthMm: 690
      }
    );
  });

  it("작은 박스 lookahead는 같은 층 전체를 끝까지 채우지 않고 제한된 시간 안에 배치한다", () => {
    // Given
    const usableSize: PlacementBounds = { widthMm: 40, depthMm: 40, heightMm: 1 };
    const startedAt = performance.now();

    // When
    const placement = findFirstStablePlacement(
      [],
      { widthMm: 1, depthMm: 1, heightMm: 1 },
      false,
      usableSize,
      FULL_SUPPORT_POLICY
    );
    const elapsedMs = performance.now() - startedAt;

    // Then
    assert.ok(placement);
    assert.ok(elapsedMs < 100, `bounded lookahead가 100ms 안에 끝나야 합니다. 실제 ${elapsedMs}ms`);
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
