import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESULT_3D_KEYBOARD_HELP_TEXT,
  RESULT_3D_KEYBOARD_ROTATION_STEP_RAD,
  RESULT_3D_KEYBOARD_ZOOM_IN_SCALE,
  RESULT_3D_KEYBOARD_ZOOM_OUT_SCALE,
  getResult3DKeyboardAction
} from "./result-3d-keyboard-controls";

describe("result-3d-keyboard-controls", () => {
  it("화살표 키는 3D 카메라를 대상 중심으로 회전시키는 델타를 반환한다", () => {
    // Given
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

    // When
    const actions = keys.map((key) => getResult3DKeyboardAction(key));

    // Then
    assert.deepEqual(actions, [
      { type: "rotate", thetaDelta: -RESULT_3D_KEYBOARD_ROTATION_STEP_RAD, phiDelta: 0 },
      { type: "rotate", thetaDelta: RESULT_3D_KEYBOARD_ROTATION_STEP_RAD, phiDelta: 0 },
      { type: "rotate", thetaDelta: 0, phiDelta: -RESULT_3D_KEYBOARD_ROTATION_STEP_RAD },
      { type: "rotate", thetaDelta: 0, phiDelta: RESULT_3D_KEYBOARD_ROTATION_STEP_RAD }
    ]);
  });

  it("확대 축소와 시점 단축키를 현장 버튼 순서와 같은 명령으로 해석한다", () => {
    // Given
    const keys = ["+", "=", "-", "1", "2", "3", "4", "0", "Escape"];

    // When
    const actions = keys.map((key) => getResult3DKeyboardAction(key));

    // Then
    assert.deepEqual(actions, [
      { type: "zoom", scale: RESULT_3D_KEYBOARD_ZOOM_IN_SCALE },
      { type: "zoom", scale: RESULT_3D_KEYBOARD_ZOOM_IN_SCALE },
      { type: "zoom", scale: RESULT_3D_KEYBOARD_ZOOM_OUT_SCALE },
      { type: "preset", preset: "isometric" },
      { type: "preset", preset: "top" },
      { type: "preset", preset: "front" },
      { type: "preset", preset: "side" },
      { type: "reset" },
      { type: "clearSelection" }
    ]);
  });

  it("3D 조작과 관계없는 키는 페이지 기본 조작을 방해하지 않는다", () => {
    // Given
    const keys = ["Tab", "Enter", " ", "a"];

    // When
    const actions = keys.map((key) => getResult3DKeyboardAction(key));

    // Then
    assert.deepEqual(actions, [null, null, null, null]);
  });

  it("스크린리더 안내는 기술어 대신 현장 조작어를 사용한다", () => {
    // Given & When
    const helpText = RESULT_3D_KEYBOARD_HELP_TEXT;

    // Then
    assert.equal(helpText.includes("화살표"), true);
    assert.equal(helpText.includes("+ / -"), true);
    assert.equal(helpText.includes("1 사시"), true);
    assert.equal(helpText.includes("Esc 전체 보기"), true);
    assert.equal(helpText.includes("OrbitControls"), false);
    assert.equal(helpText.includes("WebGL"), false);
  });
});
