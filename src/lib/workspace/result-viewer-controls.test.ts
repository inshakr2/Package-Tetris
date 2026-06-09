import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESULT_VIEW_CONTROL_ITEMS,
  RESULT_VIEW_TOUCH_TARGET_MIN_PX,
  THREE_CAMERA_CONTROL_ITEMS,
  getResultViewTitle,
  isProjectionViewControlId
} from "./result-viewer-controls";

describe("result-viewer-controls", () => {
  it("결과 보기 전환은 현장 모바일 조작에 맞는 짧은 라벨과 고정 순서를 제공한다", () => {
    // Given
    const labels = RESULT_VIEW_CONTROL_ITEMS.map((item) => item.label);
    const ids = RESULT_VIEW_CONTROL_ITEMS.map((item) => item.id);

    // When
    const longestLabelLength = Math.max(...labels.map((label) => label.length));

    // Then
    assert.deepEqual(ids, ["three", "top", "front", "side", "reset"]);
    assert.deepEqual(labels, ["3D", "위", "앞", "옆", "처음"]);
    assert.ok(longestLabelLength <= 2);
    assert.equal(RESULT_VIEW_TOUCH_TARGET_MIN_PX, 48);
  });

  it("3D 카메라 전환은 한 줄 chip row에 들어갈 수 있는 짧은 라벨을 제공한다", () => {
    // Given
    const labels = THREE_CAMERA_CONTROL_ITEMS.map((item) => item.label);
    const presets = THREE_CAMERA_CONTROL_ITEMS.map((item) => item.preset);

    // When
    const longestLabelLength = Math.max(...labels.map((label) => label.length));

    // Then
    assert.deepEqual(presets, ["isometric", "top", "front", "side"]);
    assert.deepEqual(labels, ["사시", "위", "앞", "옆"]);
    assert.ok(longestLabelLength <= 2);
  });

  it("현재 결과 보기 제목은 선택된 보기 방식을 현장 용어로 반환한다", () => {
    // Given
    const titles = [
      getResultViewTitle("three"),
      getResultViewTitle("top"),
      getResultViewTitle("front"),
      getResultViewTitle("side")
    ];

    // When & Then
    assert.deepEqual(titles, ["3D 보기", "위 보기", "앞 보기", "옆 보기"]);
  });

  it("보기 전환용 ID와 액션용 ID를 구분한다", () => {
    // Given
    const ids = RESULT_VIEW_CONTROL_ITEMS.map((item) => item.id);

    // When
    const projectionIds = ids.filter(isProjectionViewControlId);

    // Then
    assert.deepEqual(projectionIds, ["top", "front", "side"]);
    assert.equal(isProjectionViewControlId("three"), false);
    assert.equal(isProjectionViewControlId("reset"), false);
  });
});
