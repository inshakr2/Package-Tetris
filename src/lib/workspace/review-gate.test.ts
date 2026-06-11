import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOptimizationInput, createPlaceholderResultSummary, reviewExecutionReadiness } from "./review-gate";
import { BlockDefinition, SpaceDefinition } from "./types";

function createSpace(overrides: Partial<SpaceDefinition> = {}): SpaceDefinition {
  return {
    spaceId: "space-a",
    entityVersion: 1,
    name: "기본 공간",
    type: "custom",
    dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...overrides
  };
}

function createBlock(overrides: Partial<BlockDefinition> = {}): BlockDefinition {
  return {
    blockId: "block-a",
    blockTemplateId: "template-a",
    draftBlockItemId: "item-a",
    entityVersion: 1,
    name: "기본 블록",
    dimensions: { widthMm: 400, depthMm: 300, heightMm: 200 },
    quantity: 2,
    fragile: false,
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...overrides
  };
}

describe("review-gate", () => {
  it("공간이 선택되지 않으면 실행 전 검토는 error이며 CTA를 비활성화한다", () => {
    // Given
    const blocks = [createBlock()];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace: undefined,
      blocks,
      fragileStackOnFragileAllowed: true
    });

    // Then
    assert.equal(review.status, "error");
    assert.equal(review.cta.disabled, true);
    assert.equal(review.cta.disabledReason, "적재 공간을 선택하세요.");
    assert.equal(review.messages[0]?.code, "space-required");
  });

  it("블록 치수 또는 수량이 1 미만이면 실행 전 검토는 error를 반환한다", () => {
    // Given
    const selectedSpace = createSpace();
    const blocks = [
      createBlock({
        quantity: 0,
        dimensions: { widthMm: 300, depthMm: 200, heightMm: 100 }
      }),
      createBlock({
        blockId: "block-b",
        draftBlockItemId: "item-b",
        dimensions: { widthMm: 300, depthMm: 0, heightMm: 100 }
      })
    ];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true
    });

    // Then
    assert.equal(review.status, "error");
    assert.equal(review.cta.disabled, true);
    assert.deepEqual(
      review.messages.map((message) => message.code),
      ["block-quantity-invalid", "block-dimensions-invalid"]
    );
  });

  it("가져온 작업본의 수량과 치수가 비정상 숫자이면 실행 전 검토에서 막는다", () => {
    // Given
    const selectedSpace = createSpace();
    const blocks = [
      createBlock({
        quantity: Number.NaN,
        dimensions: { widthMm: 300, depthMm: 200, heightMm: 100 }
      }),
      createBlock({
        blockId: "block-b",
        draftBlockItemId: "item-b",
        quantity: 1,
        dimensions: { widthMm: Number.POSITIVE_INFINITY, depthMm: 200, heightMm: 100 }
      })
    ];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true
    });

    // Then
    assert.equal(review.status, "error");
    assert.equal(review.cta.disabled, true);
    assert.equal(review.preparedInput, null);
    assert.deepEqual(
      review.messages.map((message) => message.code),
      ["block-quantity-invalid", "block-dimensions-invalid"]
    );
  });

  it("블록이 90도 직교 회전 중 하나로 usable size에 들어가면 valid이며 엔진 입력을 만들 수 있다", () => {
    // Given
    const selectedSpace = createSpace({
      dimensions: { widthMm: 1000, depthMm: 1200, heightMm: 800 }
    });
    const blocks = [
      createBlock({
        dimensions: { widthMm: 1200, depthMm: 1000, heightMm: 800 },
        quantity: 1
      })
    ];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true
    });
    const optimizationInput = createOptimizationInput(review, "run-123");

    // Then
    assert.equal(review.status, "valid");
    assert.equal(review.cta.disabled, false);
    assert.equal(review.totals.totalBlockCount, 1);
    assert.ok(optimizationInput);
    assert.equal(optimizationInput?.runId, "run-123");
    assert.equal(optimizationInput?.space.spaceId, "space-a");
    assert.equal(optimizationInput?.policy.rotation, "orthogonal-90deg");
    assert.equal(optimizationInput?.policy.nonFragileOnFragileAllowed, false);
  });

  it("부분 지지 허용 정책을 엔진 입력에 포함한다", () => {
    // Given
    const selectedSpace = createSpace();
    const blocks = [createBlock()];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true,
      partialSupportEnabled: true,
      minimumSupportRatio: 0.55
    });
    const optimizationInput = createOptimizationInput(review, "run-partial-support");

    // Then
    assert.equal(review.status, "valid");
    assert.ok(optimizationInput);
    assert.equal(optimizationInput?.policy.partialSupportEnabled, true);
    assert.equal(optimizationInput?.policy.minimumSupportRatio, 0.55);
  });

  it("어떤 직교 회전으로도 공간에 들어가지 않는 블록이 있으면 error를 반환한다", () => {
    // Given
    const selectedSpace = createSpace({
      dimensions: { widthMm: 1000, depthMm: 900, heightMm: 800 }
    });
    const blocks = [
      createBlock({
        dimensions: { widthMm: 1100, depthMm: 700, heightMm: 700 },
        quantity: 1
      })
    ];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true
    });

    // Then
    assert.equal(review.status, "error");
    assert.equal(review.cta.disabled, true);
    assert.equal(review.messages[0]?.code, "block-does-not-fit");
  });

  it("총 부피가 단일 usable 공간을 넘으면 warning이며 placeholder 요약은 검토 결과를 사용한다", () => {
    // Given
    const selectedSpace = createSpace();
    const blocks = [
      createBlock({
        dimensions: { widthMm: 800, depthMm: 800, heightMm: 800 },
        quantity: 3
      })
    ];

    // When
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true
    });
    const placeholder = createPlaceholderResultSummary(review, {
      resultId: "result-123",
      createdAt: "2026-06-08T01:00:00.000Z"
    });

    // Then
    assert.equal(review.status, "warning");
    assert.equal(review.cta.disabled, false);
    assert.equal(review.totals.minimumSpaceCountLowerBound, 2);
    assert.equal(review.messages[0]?.code, "multi-space-likely");
    assert.equal(
      review.messages[0]?.text,
      "부피로만 보면 최소 2개 공간이 필요할 수 있습니다. 실제로는 받쳐 주는 바닥과 쌓는 규칙 때문에 더 늘어날 수 있습니다."
    );
    assert.equal(placeholder?.usedSpaceCount, 2);
    assert.equal(placeholder?.averageUtilizationRate, 0.768);
    assert.equal(placeholder?.unloadedBlockCount, 0);
  });
});
