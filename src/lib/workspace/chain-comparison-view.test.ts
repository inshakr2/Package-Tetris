import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveChainComparisonSpaces } from "./chain-comparison-view";
import { PackedSpace } from "./types";

function createPackedSpace(spaceInstanceId: string): PackedSpace {
  return {
    spaceInstanceId,
    utilizationRate: 0.5,
    blocks: []
  };
}

describe("chain-comparison-view", () => {
  it("추가 결과 모드는 체이닝 미리보기 공간을 표시한다", () => {
    // Given
    const originalSpaces = [createPackedSpace("original-space")];
    const previewSpaces = [createPackedSpace("preview-space")];

    // When
    const spaces = resolveChainComparisonSpaces({
      mode: "preview",
      originalSpaces,
      previewSpaces
    });

    // Then
    assert.equal(spaces[0].spaceInstanceId, "preview-space");
  });

  it("원본 모드는 체이닝 미리보기가 있어도 기준 결과 공간을 표시한다", () => {
    // Given
    const originalSpaces = [createPackedSpace("original-space")];
    const previewSpaces = [createPackedSpace("preview-space")];

    // When
    const spaces = resolveChainComparisonSpaces({
      mode: "original",
      originalSpaces,
      previewSpaces
    });

    // Then
    assert.equal(spaces[0].spaceInstanceId, "original-space");
  });

  it("미리보기가 없으면 추가 결과 모드도 기준 결과 공간으로 돌아간다", () => {
    // Given
    const originalSpaces = [createPackedSpace("original-space")];

    // When
    const spaces = resolveChainComparisonSpaces({
      mode: "preview",
      originalSpaces,
      previewSpaces: null
    });

    // Then
    assert.equal(spaces[0].spaceInstanceId, "original-space");
  });
});
