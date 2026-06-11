import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPackingEngineV0 } from "./packing-engine";
import { OptimizationInput } from "./engine-contract";
import { calculateUsableSize } from "./presets";
import { PackedBlock } from "./types";

function createInput(overrides: Partial<OptimizationInput> = {}): OptimizationInput {
  return {
    runId: "run-a",
    space: {
      spaceId: "space-a",
      entityVersion: 1,
      name: "테스트 공간",
      type: "custom",
      dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
      offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
      createdAt: "2026-06-08T00:00:00.000Z",
      updatedAt: "2026-06-08T00:00:00.000Z"
    },
    blocks: [
      {
        blockId: "block-a",
        blockTemplateId: "template-a",
        draftBlockItemId: "item-a",
        entityVersion: 1,
        name: "A 박스",
        dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
        quantity: 4,
        fragile: false,
        createdAt: "2026-06-08T00:00:00.000Z",
        updatedAt: "2026-06-08T00:00:00.000Z"
      }
    ],
    policy: {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      rotation: "orthogonal-90deg"
    },
    ...overrides
  };
}

describe("packing-engine v0", () => {
  it("같은 입력은 같은 좌표를 가진 결정론적 배치 결과를 만든다", () => {
    // Given
    const input = createInput();

    // When
    const firstOutput = runPackingEngineV0(input);
    const secondOutput = runPackingEngineV0(input);

    // Then
    assert.deepEqual(firstOutput, secondOutput);
    assert.equal(firstOutput.usedSpaceCount, 1);
    assert.equal(firstOutput.unloadedBlockCount, 0);
    assert.equal(firstOutput.spaces[0]?.blocks.length, 4);
    assert.deepEqual(
      firstOutput.spaces[0]?.blocks.map((block) => [block.xMm, block.yMm, block.zMm]),
      [
        [0, 0, 0],
        [500, 0, 0],
        [0, 500, 0],
        [500, 500, 0]
      ]
    );
  });

  it("블록 수량이 단일 공간을 넘으면 다음 공간 인스턴스를 사용한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          quantity: 9
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.usedSpaceCount, 2);
    assert.equal(output.spaces[0]?.blocks.length, 8);
    assert.equal(output.spaces[1]?.blocks.length, 1);
    assert.equal(output.averageUtilizationRate, 0.563);
  });

  it("fragile 위에 non-fragile이 올라가지 않도록 non-fragile을 먼저 배치한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-fragile",
          blockTemplateId: "template-fragile",
          name: "취급주의 박스",
          fragile: true,
          quantity: 1
        },
        {
          ...createInput().blocks[0],
          blockId: "block-normal",
          blockTemplateId: "template-normal",
          name: "일반 박스",
          fragile: false,
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.spaces[0]?.blocks[0]?.blockTemplateId, "template-normal");
    assert.equal(output.spaces[0]?.blocks[1]?.blockTemplateId, "template-fragile");
  });

  it("loadPriority가 높은 작업 박스를 기존 크기 정렬보다 먼저 바닥에 배치한다", () => {
    // Given
    const input = createInput({
      space: {
        ...createInput().space,
        dimensions: { widthMm: 1000, depthMm: 500, heightMm: 1000 }
      },
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-large-low-priority",
          blockTemplateId: "template-large-low-priority",
          draftBlockItemId: "item-large-low-priority",
          name: "큰 일반 박스",
          dimensions: { widthMm: 500, depthMm: 500, heightMm: 700 },
          quantity: 1,
          loadPriority: 1
        },
        {
          ...createInput().blocks[0],
          blockId: "block-small-high-priority",
          blockTemplateId: "template-small-high-priority",
          draftBlockItemId: "item-small-high-priority",
          name: "먼저 깔 박스",
          dimensions: { widthMm: 500, depthMm: 500, heightMm: 200 },
          quantity: 1,
          loadPriority: 10
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);
    const firstSpace = output.spaces[0];

    // Then
    assert.equal(output.usedSpaceCount, 1);
    assert.equal(output.unloadedBlockCount, 0);
    assert.ok(firstSpace);
    assert.deepEqual(
      firstSpace?.blocks.map((block) => ({
        blockTemplateId: block.blockTemplateId,
        xMm: block.xMm,
        yMm: block.yMm,
        zMm: block.zMm
      })),
      [
        {
          blockTemplateId: "template-small-high-priority",
          xMm: 0,
          yMm: 0,
          zMm: 0
        },
        {
          blockTemplateId: "template-large-low-priority",
          xMm: 500,
          yMm: 0,
          zMm: 0
        }
      ]
    );
    assertStablePackedBlocks(firstSpace?.blocks ?? [], calculateUsableSize(input.space));
  });

  it("loadPriority가 같으면 기존 결정론적 크기 정렬을 유지한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-flat",
          blockTemplateId: "template-flat",
          name: "일반 판형 박스",
          dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 150 },
          quantity: 1,
          fragile: false,
          loadPriority: 3
        },
        {
          ...createInput().blocks[0],
          blockId: "block-solid",
          blockTemplateId: "template-solid",
          name: "일반 고형 박스",
          dimensions: { widthMm: 500, depthMm: 500, heightMm: 700 },
          quantity: 1,
          fragile: false,
          loadPriority: 3
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);
    const firstSpace = output.spaces[0];

    // Then
    assert.equal(output.usedSpaceCount, 1);
    assert.equal(output.unloadedBlockCount, 0);
    assert.ok(firstSpace);
    assert.deepEqual(
      firstSpace?.blocks.map((block) => block.blockTemplateId),
      ["template-flat", "template-solid"]
    );
    assertStablePackedBlocks(firstSpace?.blocks ?? [], calculateUsableSize(input.space));
  });

  it("90도 직교 회전을 적용해 들어갈 수 있는 방향을 선택한다", () => {
    // Given
    const input = createInput({
      space: {
        ...createInput().space,
        dimensions: { widthMm: 700, depthMm: 500, heightMm: 300 }
      },
      blocks: [
        {
          ...createInput().blocks[0],
          dimensions: { widthMm: 500, depthMm: 700, heightMm: 300 },
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.unloadedBlockCount, 0);
    assert.equal(output.spaces[0]?.blocks[0]?.widthMm, 700);
    assert.equal(output.spaces[0]?.blocks[0]?.depthMm, 500);
    assert.equal(output.spaces[0]?.blocks[0]?.rotation, "yxz");
  });

  it("과거 cursor 방식에서 공중 배치되던 박스를 남은 바닥면으로 회전 배치한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-a",
          blockTemplateId: "template-a",
          name: "A 박스",
          dimensions: { widthMm: 1000, depthMm: 500, heightMm: 500 },
          quantity: 1
        },
        {
          ...createInput().blocks[0],
          blockId: "block-b",
          blockTemplateId: "template-b",
          name: "B 박스",
          dimensions: { widthMm: 500, depthMm: 1000, heightMm: 500 },
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);
    const firstSpace = output.spaces[0];

    // Then
    assert.equal(output.unloadedBlockCount, 0);
    assert.ok(firstSpace);
    assert.deepEqual(
      firstSpace?.blocks.map((block) => ({
        blockTemplateId: block.blockTemplateId,
        xMm: block.xMm,
        yMm: block.yMm,
        zMm: block.zMm,
        widthMm: block.widthMm,
        depthMm: block.depthMm,
        heightMm: block.heightMm
      })),
      [
        {
          blockTemplateId: "template-a",
          xMm: 0,
          yMm: 0,
          zMm: 0,
          widthMm: 1000,
          depthMm: 500,
          heightMm: 500
        },
        {
          blockTemplateId: "template-b",
          xMm: 0,
          yMm: 500,
          zMm: 0,
          widthMm: 1000,
          depthMm: 500,
          heightMm: 500
        }
      ]
    );
    assertStablePackedBlocks(firstSpace?.blocks ?? [], calculateUsableSize(input.space));
  });

  it("offset이 있어도 usable size 경계 안에서만 안정 배치한다", () => {
    // Given
    const input = createInput({
      space: {
        ...createInput().space,
        dimensions: { widthMm: 1200, depthMm: 1200, heightMm: 1200 },
        offset: { widthMm: 100, depthMm: 200, heightMm: 300 }
      },
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-a",
          blockTemplateId: "template-a",
          name: "A 박스",
          dimensions: { widthMm: 1100, depthMm: 500, heightMm: 450 },
          quantity: 1
        },
        {
          ...createInput().blocks[0],
          blockId: "block-b",
          blockTemplateId: "template-b",
          name: "B 박스",
          dimensions: { widthMm: 500, depthMm: 1000, heightMm: 450 },
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);
    const firstSpace = output.spaces[0];

    // Then
    assert.equal(output.unloadedBlockCount, 0);
    assert.ok(firstSpace);
    assert.deepEqual(
      firstSpace?.blocks.map((block) => [block.xMm, block.yMm, block.zMm, block.widthMm, block.depthMm, block.heightMm]),
      [
        [0, 0, 0, 1100, 500, 450],
        [0, 500, 0, 1000, 500, 450]
      ]
    );
    assertStablePackedBlocks(firstSpace?.blocks ?? [], calculateUsableSize(input.space));
  });

  it("같은 fragile 그룹이면 큰 받침면이 되는 판형 박스를 먼저 깔아 불필요한 새 공간 생성을 줄인다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-flat",
          blockTemplateId: "template-flat",
          name: "일반 판형 박스",
          dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 150 },
          quantity: 1,
          fragile: false
        },
        {
          ...createInput().blocks[0],
          blockId: "block-solid",
          blockTemplateId: "template-solid",
          name: "일반 고형 박스",
          dimensions: { widthMm: 500, depthMm: 500, heightMm: 700 },
          quantity: 1,
          fragile: false
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);
    const firstSpace = output.spaces[0];

    // Then
    assert.equal(output.usedSpaceCount, 1);
    assert.equal(output.unloadedBlockCount, 0);
    assert.ok(firstSpace);
    assert.deepEqual(
      firstSpace?.blocks.map((block) => ({
        blockTemplateId: block.blockTemplateId,
        xMm: block.xMm,
        yMm: block.yMm,
        zMm: block.zMm,
        widthMm: block.widthMm,
        depthMm: block.depthMm,
        heightMm: block.heightMm
      })),
      [
        {
          blockTemplateId: "template-flat",
          xMm: 0,
          yMm: 0,
          zMm: 0,
          widthMm: 1000,
          depthMm: 1000,
          heightMm: 150
        },
        {
          blockTemplateId: "template-solid",
          xMm: 0,
          yMm: 0,
          zMm: 150,
          widthMm: 500,
          depthMm: 500,
          heightMm: 700
        }
      ]
    );
    assertStablePackedBlocks(firstSpace?.blocks ?? [], calculateUsableSize(input.space));
  });

  it("회전 선택지가 적은 박스를 먼저 배치해 불필요한 공간 분리를 줄인다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-wide-tall",
          blockTemplateId: "template-wide-tall",
          name: "넓고 높은 박스",
          dimensions: { widthMm: 750, depthMm: 800, heightMm: 1000 },
          quantity: 2
        },
        {
          ...createInput().blocks[0],
          blockId: "block-constrained",
          blockTemplateId: "template-constrained",
          name: "회전 제한 박스",
          dimensions: { widthMm: 600, depthMm: 800, heightMm: 600 },
          quantity: 2
        },
        {
          ...createInput().blocks[0],
          blockId: "block-side-fill",
          blockTemplateId: "template-side-fill",
          name: "측면 채움 박스",
          dimensions: { widthMm: 400, depthMm: 800, heightMm: 700 },
          quantity: 2
        },
        {
          ...createInput().blocks[0],
          blockId: "block-narrow-fill",
          blockTemplateId: "template-narrow-fill",
          name: "좁은 채움 박스",
          dimensions: { widthMm: 650, depthMm: 900, heightMm: 200 },
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.usedSpaceCount, 4);
    assert.equal(output.unloadedBlockCount, 0);
    output.spaces.forEach((space) => {
      assertStablePackedBlocks(space.blocks, calculateUsableSize(input.space));
    });
    assert.ok(
      (output.spaces[0]?.blocks.length ?? 0) >= 3,
      "선택지가 적은 박스를 먼저 두면 첫 공간에 보조 박스까지 함께 들어가야 합니다."
    );
  });
});

function assertStablePackedBlocks(
  blocks: PackedBlock[],
  bounds: { widthMm: number; depthMm: number; heightMm: number }
) {
  blocks.forEach((block) => {
    assert.ok(block.xMm >= 0);
    assert.ok(block.yMm >= 0);
    assert.ok(block.zMm >= 0);
    assert.ok(block.xMm + block.widthMm <= bounds.widthMm);
    assert.ok(block.yMm + block.depthMm <= bounds.depthMm);
    assert.ok(block.zMm + block.heightMm <= bounds.heightMm);
  });

  blocks.forEach((block, index) => {
    blocks.slice(index + 1).forEach((other) => {
      assert.equal(overlaps3d(block, other), false, `${block.blockId}와 ${other.blockId}가 겹치면 안 됩니다.`);
    });

    if (block.zMm === 0) {
      return;
    }

    const supportBlocks = blocks.filter((other) => {
      return (
        other.blockId !== block.blockId &&
        other.zMm + other.heightMm === block.zMm &&
        rangesOverlap(other.xMm, other.xMm + other.widthMm, block.xMm, block.xMm + block.widthMm) &&
        rangesOverlap(other.yMm, other.yMm + other.depthMm, block.yMm, block.yMm + block.depthMm)
      );
    });

    const supportedArea = supportBlocks.reduce((sum, supportBlock) => sum + intersectionArea2d(supportBlock, block), 0);

    assert.equal(
      supportedArea,
      block.widthMm * block.depthMm,
      `${block.blockId}는 바닥 또는 하부 박스에 전체 면적이 지지되어야 합니다.`
    );
  });
}

function overlaps3d(left: PackedBlock, right: PackedBlock) {
  return (
    rangesOverlap(left.xMm, left.xMm + left.widthMm, right.xMm, right.xMm + right.widthMm) &&
    rangesOverlap(left.yMm, left.yMm + left.depthMm, right.yMm, right.yMm + right.depthMm) &&
    rangesOverlap(left.zMm, left.zMm + left.heightMm, right.zMm, right.zMm + right.heightMm)
  );
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function intersectionArea2d(base: PackedBlock, top: PackedBlock) {
  const width = Math.min(base.xMm + base.widthMm, top.xMm + top.widthMm) - Math.max(base.xMm, top.xMm);
  const depth = Math.min(base.yMm + base.depthMm, top.yMm + top.depthMm) - Math.max(base.yMm, top.yMm);

  return Math.max(0, width) * Math.max(0, depth);
}
