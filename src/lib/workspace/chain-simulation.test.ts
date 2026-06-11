import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NO_STABLE_CHAIN_PLACEMENT_WARNING, runChainSimulationV0 } from "./chain-simulation";
import { BlockTemplate, PackedBlock, ResultSummary, SpaceDefinition } from "./types";

const TIMESTAMP = "2026-06-08T00:00:00.000Z";
const DEFAULT_POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const
};

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

function createTemplate(overrides: Partial<BlockTemplate> = {}): BlockTemplate {
  return {
    blockTemplateId: "template-extra",
    entityVersion: 1,
    name: "추가 박스",
    dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
    fragile: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides
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
    depthMm: 1000,
    heightMm: 1000,
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

describe("chain-simulation v0", () => {
  it("기존 배치를 유지한 채 남은 공간에 선택 블록을 최대 수량까지 추가한다", () => {
    // Given
    const result = createResult([createPackedBlock()]);
    const template = createTemplate();

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: template,
      runId: "chain-run-a",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.equal(output.addedQuantity, 4);
    assert.equal(output.spaces[0]?.blocks.length, 5);
    assert.deepEqual(
      output.spaces[0]?.blocks.slice(1).map((block) => [block.xMm, block.yMm, block.zMm]),
      [
        [500, 0, 0],
        [500, 500, 0],
        [500, 0, 500],
        [500, 500, 500]
      ]
    );
    assert.equal(output.averageUtilizationRate, 1);
  });

  it("기존 결과 공간이 꽉 차 있으면 추가 가능 수량 0을 반환한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 1000
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate(),
      runId: "chain-run-full",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.equal(output.spaces[0]?.blocks.length, 1);
  });

  it("요청 수량이 있으면 최대 적재량이 더 커도 요청한 수량까지만 추가한다", () => {
    // Given
    const result = createResult([createPackedBlock()]);
    const template = createTemplate();

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: template,
      runId: "chain-run-requested",
      policy: DEFAULT_POLICY,
      requestedQuantity: 2
    });

    // Then
    assert.equal(output.addedQuantity, 2);
    assert.equal(output.spaces[0]?.blocks.length, 3);
    assert.deepEqual(
      output.spaces[0]?.blocks.slice(1).map((block) => block.blockId),
      ["chain-run-requested-block-1", "chain-run-requested-block-2"]
    );
  });

  it("요청 수량이 1개 미만이면 추가 계산을 하지 않고 작업자 안내를 반환한다", () => {
    // Given
    const result = createResult([createPackedBlock()]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate(),
      runId: "chain-run-invalid-requested",
      policy: DEFAULT_POLICY,
      requestedQuantity: 0
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.deepEqual(output.warnings, ["추가할 수량은 1개 이상이어야 합니다."]);
  });

  it("non-fragile 추가 블록은 fragile 지지면 위에 배치하지 않는다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({ fragile: false }),
      runId: "chain-run-fragile-support",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.equal(output.addedQuantity, 0);
  });

  it("fragile 추가 블록은 fragile 지지면 위에도 배치할 수 있다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({ fragile: true }),
      runId: "chain-run-fragile-on-fragile",
      policy: {
        fragileStackOnFragileAllowed: true,
        nonFragileOnFragileAllowed: false
      }
    });

    // Then
    assert.equal(output.addedQuantity, 4);
    assert.equal(output.spaces[0]?.blocks.at(-1)?.zMm, 500);
  });

  it("fragile 적층 금지 정책이면 fragile 추가 블록도 fragile 지지면 위에 배치하지 않는다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({ fragile: true }),
      runId: "chain-run-fragile-disallowed",
      policy: {
        fragileStackOnFragileAllowed: false,
        nonFragileOnFragileAllowed: false
      }
    });

    // Then
    assert.equal(output.addedQuantity, 0);
  });

  it("부분 지지 허용 ON이면 기존 배치 위 55% 이상 받침면에 추가 블록을 배치한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "support",
        widthMm: 600,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({
        dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 500 }
      }),
      runId: "chain-run-partial-support",
      policy: {
        fragileStackOnFragileAllowed: true,
        nonFragileOnFragileAllowed: false,
        partialSupportEnabled: true,
        minimumSupportRatio: 0.55
      }
    });

    // Then
    assert.equal(output.addedQuantity, 1);
    const addedBlock = output.spaces[0]?.blocks.at(-1);
    assert.equal(addedBlock?.blockId, "chain-run-partial-support-block-1");
    assert.equal(addedBlock?.blockTemplateId, "template-extra");
    assert.equal(addedBlock?.name, "추가 박스");
    assert.equal(addedBlock?.fragile, false);
    assert.equal(addedBlock?.xMm, 0);
    assert.equal(addedBlock?.yMm, 0);
    assert.equal(addedBlock?.zMm, 500);
    assert.equal(addedBlock?.widthMm, 1000);
    assert.equal(addedBlock?.depthMm, 1000);
    assert.equal(addedBlock?.heightMm, 500);
  });

  it("부피는 남아도 안정적으로 받칠 바닥면이 부족하면 현장 안내를 반환한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "partial-floor",
        widthMm: 600,
        depthMm: 1000,
        heightMm: 100
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({
        dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 500 }
      }),
      runId: "chain-run-no-stable-placement",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.deepEqual(output.warnings, [NO_STABLE_CHAIN_PLACEMENT_WARNING]);
  });

  it("기존 결과에 공중에 떠 있는 블록이 있으면 추가 적재 계산을 거부한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "floating",
        zMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate(),
      runId: "chain-run-invalid-floating",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.deepEqual(output.spaces, result.spaces);
    assert.deepEqual(output.warnings, [
      "기존 결과의 배치가 안전 기준에 맞지 않아 추가 적재를 계산할 수 없습니다. 결과를 다시 생성하세요."
    ]);
  });

  it("기존 결과에 겹치는 블록이 있으면 추가 적재 계산을 거부한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "base-left",
        xMm: 0,
        yMm: 0,
        zMm: 0
      }),
      createPackedBlock({
        blockId: "base-right",
        xMm: 250,
        yMm: 0,
        zMm: 0
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate(),
      runId: "chain-run-invalid-overlap",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.deepEqual(output.spaces, result.spaces);
    assert.deepEqual(output.warnings, [
      "기존 결과의 배치가 안전 기준에 맞지 않아 추가 적재를 계산할 수 없습니다. 결과를 다시 생성하세요."
    ]);
  });

  it("기존 결과가 fragile 정책을 어기면 추가 적재 계산을 거부한다", () => {
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
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({ fragile: true }),
      runId: "chain-run-invalid-fragile-policy",
      policy: {
        fragileStackOnFragileAllowed: false,
        nonFragileOnFragileAllowed: false
      }
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.deepEqual(output.spaces, result.spaces);
    assert.deepEqual(output.warnings, [
      "기존 결과의 배치가 안전 기준에 맞지 않아 추가 적재를 계산할 수 없습니다. 결과를 다시 생성하세요."
    ]);
  });
});
