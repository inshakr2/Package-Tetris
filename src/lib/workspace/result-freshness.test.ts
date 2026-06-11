import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createResultFreshnessState,
  createResultInputFingerprint
} from "./result-freshness";
import { BlockDefinition, SpaceDefinition } from "./types";

function createSpace(overrides: Partial<SpaceDefinition> = {}): SpaceDefinition {
  return {
    spaceId: "space-a",
    entityVersion: 1,
    name: "현장 팔레트",
    type: "custom",
    dimensions: { widthMm: 1000, depthMm: 900, heightMm: 1200 },
    offset: { widthMm: 20, depthMm: 20, heightMm: 50 },
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
    name: "A 박스",
    dimensions: { widthMm: 300, depthMm: 220, heightMm: 180 },
    quantity: 3,
    fragile: false,
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...overrides
  };
}

describe("result-freshness", () => {
  it("동일한 공간, 박스, 정책이면 같은 입력 fingerprint를 만든다", () => {
    // Given
    const selectedSpace = createSpace();
    const blocks = [
      createBlock({ blockTemplateId: "template-b", draftBlockItemId: "item-b", name: "B 박스" }),
      createBlock({ blockTemplateId: "template-a", draftBlockItemId: "item-a", name: "A 박스" })
    ];

    // When
    const first = createResultInputFingerprint({
      selectedSpace,
      blocks,
      fragileStackOnFragileAllowed: true
    });
    const second = createResultInputFingerprint({
      selectedSpace,
      blocks: blocks.slice().reverse(),
      fragileStackOnFragileAllowed: true
    });

    // Then
    assert.equal(first, second);
  });

  it("박스 수량, 공간, 정책이 바뀌면 입력 fingerprint도 바뀐다", () => {
    // Given
    const baseInput = {
      selectedSpace: createSpace(),
      blocks: [createBlock()],
      fragileStackOnFragileAllowed: true
    };
    const baseFingerprint = createResultInputFingerprint(baseInput);

    // When
    const quantityChanged = createResultInputFingerprint({
      ...baseInput,
      blocks: [createBlock({ quantity: 4 })]
    });
    const priorityChanged = createResultInputFingerprint({
      ...baseInput,
      blocks: [createBlock({ loadPriority: 5 })]
    });
    const spaceChanged = createResultInputFingerprint({
      ...baseInput,
      selectedSpace: createSpace({ offset: { widthMm: 50, depthMm: 20, heightMm: 50 } })
    });
    const policyChanged = createResultInputFingerprint({
      ...baseInput,
      fragileStackOnFragileAllowed: false
    });
    const partialSupportPolicyChanged = createResultInputFingerprint({
      ...baseInput,
      partialSupportEnabled: true,
      minimumSupportRatio: 0.55
    });

    // Then
    assert.notEqual(baseFingerprint, quantityChanged);
    assert.notEqual(baseFingerprint, priorityChanged);
    assert.notEqual(baseFingerprint, spaceChanged);
    assert.notEqual(baseFingerprint, policyChanged);
    assert.notEqual(baseFingerprint, partialSupportPolicyChanged);
  });

  it("부분 지지 최소 비율이 비어 있으면 기본 55% 정책과 같은 fingerprint를 만든다", () => {
    // Given
    const baseInput = {
      selectedSpace: createSpace(),
      blocks: [createBlock()],
      fragileStackOnFragileAllowed: true,
      partialSupportEnabled: true
    };

    // When
    const missingMinimumRatio = createResultInputFingerprint(baseInput);
    const defaultMinimumRatio = createResultInputFingerprint({
      ...baseInput,
      minimumSupportRatio: 0.55
    });

    // Then
    assert.equal(missingMinimumRatio, defaultMinimumRatio);
  });

  it("기존 결과에 fingerprint가 없으면 경고 없이 판정 보류 상태를 반환한다", () => {
    // Given
    const currentFingerprint = createResultInputFingerprint({
      selectedSpace: createSpace(),
      blocks: [createBlock()],
      fragileStackOnFragileAllowed: true
    });

    // When
    const state = createResultFreshnessState({
      currentFingerprint,
      resultFingerprint: undefined,
      canCreateResult: true,
      disabledReason: null
    });

    // Then
    assert.deepEqual(state, {
      status: "unknown",
      visible: false,
      tone: "neutral",
      title: "결과 기준 확인 중",
      description: "이전 작업본의 결과는 입력 기준을 자동 판정하지 않습니다.",
      ctaLabel: "결과 다시 만들기",
      ctaDisabled: false,
      ctaDisabledReason: null
    });
  });

  it("현재 입력과 결과 fingerprint가 다르면 재계산 안내 상태를 반환한다", () => {
    // Given
    const resultFingerprint = createResultInputFingerprint({
      selectedSpace: createSpace(),
      blocks: [createBlock()],
      fragileStackOnFragileAllowed: true
    });
    const currentFingerprint = createResultInputFingerprint({
      selectedSpace: createSpace(),
      blocks: [createBlock({ quantity: 5 })],
      fragileStackOnFragileAllowed: true
    });

    // When
    const state = createResultFreshnessState({
      currentFingerprint,
      resultFingerprint,
      canCreateResult: true,
      disabledReason: null
    });

    // Then
    assert.deepEqual(state, {
      status: "stale",
      visible: true,
      tone: "amber",
      title: "입력이 바뀌었습니다",
      description: "지금 결과는 이전 입력 기준입니다. 최신 박스와 공간으로 다시 계산하세요.",
      ctaLabel: "결과 다시 만들기",
      ctaDisabled: false,
      ctaDisabledReason: null
    });
  });
});
