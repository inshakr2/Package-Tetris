import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PALLET_SPACE_ID,
  OVERHANG_PALLET_SPACE_ID,
  PRESET_SPACES,
  calculateUsableSize,
  findPresetSpaceById,
  normalizePresetSpaceId
} from "./presets";
import { createDefaultWorkspace } from "./workspace-factory";

describe("workspace presets", () => {
  it("현장 기본 파레트와 오버행 파레트는 입고 기준 치수와 안전 여유 0을 사용한다", () => {
    // Given
    const basicPallet = findPresetSpaceById(DEFAULT_PALLET_SPACE_ID);
    const overhangPallet = findPresetSpaceById(OVERHANG_PALLET_SPACE_ID);

    // When
    const basicUsableSize = basicPallet ? calculateUsableSize(basicPallet) : null;
    const overhangUsableSize = overhangPallet ? calculateUsableSize(overhangPallet) : null;

    // Then
    assert.equal(PRESET_SPACES[0]?.spaceId, DEFAULT_PALLET_SPACE_ID);
    assert.deepEqual(basicPallet?.dimensions, { widthMm: 1100, depthMm: 1100, heightMm: 1550 });
    assert.deepEqual(basicPallet?.offset, { widthMm: 0, depthMm: 0, heightMm: 0 });
    assert.deepEqual(basicUsableSize, { widthMm: 1100, depthMm: 1100, heightMm: 1550 });
    assert.deepEqual(overhangPallet?.dimensions, { widthMm: 1150, depthMm: 1150, heightMm: 1550 });
    assert.deepEqual(overhangPallet?.offset, { widthMm: 0, depthMm: 0, heightMm: 0 });
    assert.deepEqual(overhangUsableSize, { widthMm: 1150, depthMm: 1150, heightMm: 1550 });
  });

  it("신규 작업과 기존 preset-pallet-1150 저장값은 기본 파레트로 연결된다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-10T00:00:00.000Z"
    });

    // When
    const normalizedLegacySpaceId = normalizePresetSpaceId("preset-pallet-1150");
    const legacyPresetSpace = findPresetSpaceById("preset-pallet-1150");

    // Then
    assert.equal(workspace.draft.selectedSpaceId, DEFAULT_PALLET_SPACE_ID);
    assert.equal(normalizedLegacySpaceId, DEFAULT_PALLET_SPACE_ID);
    assert.equal(legacyPresetSpace?.spaceId, DEFAULT_PALLET_SPACE_ID);
  });
});
