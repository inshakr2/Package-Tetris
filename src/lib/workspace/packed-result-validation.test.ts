import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePackedResult } from "./packed-result-validation";
import { PackedBlock, ResultSummary, SpaceDefinition } from "./types";

const TIMESTAMP = "2026-06-09T00:00:00.000Z";
const DEFAULT_POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const
};

describe("packed-result-validation", () => {
  it("정상 결과면 안전 기준 검증을 통과한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "base-floor",
        widthMm: 1000,
        depthMm: 500,
        heightMm: 500
      }),
      createPackedBlock({
        blockId: "top-fragile",
        fragile: true,
        xMm: 0,
        yMm: 0,
        zMm: 500,
        widthMm: 1000,
        depthMm: 500,
        heightMm: 500
      })
    ]);

    // When
    const validation = validatePackedResult(result, DEFAULT_POLICY);

    // Then
    assert.equal(validation.isValid, true);
    assert.deepEqual(validation.reasons, []);
  });

  it("공중에 떠 있는 블록이 있으면 안전 기준 검증에 실패한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "floating",
        zMm: 500
      })
    ]);

    // When
    const validation = validatePackedResult(result, DEFAULT_POLICY);

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons[0] ?? "", /안전 기준/);
  });

  it("겹치는 블록이 있으면 안전 기준 검증에 실패한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "left",
        xMm: 0,
        yMm: 0,
        zMm: 0
      }),
      createPackedBlock({
        blockId: "right",
        xMm: 250,
        yMm: 0,
        zMm: 0
      })
    ]);

    // When
    const validation = validatePackedResult(result, DEFAULT_POLICY);

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons[0] ?? "", /안전 기준/);
  });

  it("blockId가 중복된 결과도 인덱스 기준으로 겹침을 검증한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "duplicated",
        xMm: 0,
        yMm: 0,
        zMm: 0
      }),
      createPackedBlock({
        blockId: "duplicated",
        xMm: 250,
        yMm: 0,
        zMm: 0
      })
    ]);

    // When
    const validation = validatePackedResult(result, DEFAULT_POLICY);

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons[0] ?? "", /안전 기준/);
  });

  it("fragile 적층 금지 정책인데 fragile 지지면 위에 fragile이 올라가면 실패한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "fragile-base",
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      }),
      createPackedBlock({
        blockId: "fragile-top",
        fragile: true,
        xMm: 0,
        yMm: 0,
        zMm: 500,
        widthMm: 500,
        depthMm: 500,
        heightMm: 500
      })
    ]);

    // When
    const validation = validatePackedResult(result, {
      fragileStackOnFragileAllowed: false,
      nonFragileOnFragileAllowed: false
    });

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons[0] ?? "", /안전 기준/);
  });

  it("부분 지지 허용 ON이면 55% 이상 받침면의 기존 결과를 안전한 결과로 인정한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "support",
        widthMm: 600,
        depthMm: 1000,
        heightMm: 500
      }),
      createPackedBlock({
        blockId: "partially-supported-top",
        xMm: 0,
        yMm: 0,
        zMm: 500,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const validation = validatePackedResult(result, {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      partialSupportEnabled: true,
      minimumSupportRatio: 0.55
    });

    // Then
    assert.equal(validation.isValid, true);
    assert.deepEqual(validation.reasons, []);
  });

  it("부분 지지 허용 ON이어도 55%보다 작은 받침면의 기존 결과는 거부한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "support",
        widthMm: 549,
        depthMm: 1000,
        heightMm: 500
      }),
      createPackedBlock({
        blockId: "under-supported-top",
        xMm: 0,
        yMm: 0,
        zMm: 500,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const validation = validatePackedResult(result, {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      partialSupportEnabled: true,
      minimumSupportRatio: 0.55
    });

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons[0] ?? "", /안전 기준/);
  });
});

function createSpace(): SpaceDefinition {
  return {
    spaceId: "space-a",
    entityVersion: 1,
    name: "테스트 공간",
    type: "custom",
    dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function createPackedBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "packed-a",
    blockTemplateId: "template-base",
    name: "기존 박스",
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

function createResult(blocks: PackedBlock[]): ResultSummary {
  return {
    resultId: "result-a",
    runId: "run-a",
    createdAt: TIMESTAMP,
    spaceSnapshot: createSpace(),
    usedSpaceCount: 1,
    averageUtilizationRate: 0.5,
    unloadedBlockCount: 0,
    spaces: [
      {
        spaceInstanceId: "space-instance-a",
        utilizationRate: 0.5,
        blocks
      }
    ]
  };
}
