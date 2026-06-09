import type { ResultThreeCameraPreset } from "./result-viewer-controls";

export const RESULT_3D_KEYBOARD_ROTATION_STEP_RAD = 0.16;
export const RESULT_3D_KEYBOARD_ZOOM_IN_SCALE = 0.88;
export const RESULT_3D_KEYBOARD_ZOOM_OUT_SCALE = 1.12;
export const RESULT_3D_KEYBOARD_HELP_TEXT =
  "Tab으로 3D 보기 선택 후 화살표로 회전, + / - 로 확대 축소, 1 자유시점, 2 위, 3 앞, 4 옆, 0 처음, Esc 전체 보기";

export type Result3DKeyboardAction =
  | {
      type: "rotate";
      thetaDelta: number;
      phiDelta: number;
    }
  | {
      type: "zoom";
      scale: number;
    }
  | {
      type: "preset";
      preset: ResultThreeCameraPreset;
    }
  | {
      type: "reset";
    }
  | {
      type: "clearSelection";
    };

export function getResult3DKeyboardAction(key: string): Result3DKeyboardAction | null {
  if (key === "ArrowLeft") {
    return { type: "rotate", thetaDelta: -RESULT_3D_KEYBOARD_ROTATION_STEP_RAD, phiDelta: 0 };
  }

  if (key === "ArrowRight") {
    return { type: "rotate", thetaDelta: RESULT_3D_KEYBOARD_ROTATION_STEP_RAD, phiDelta: 0 };
  }

  if (key === "ArrowUp") {
    return { type: "rotate", thetaDelta: 0, phiDelta: -RESULT_3D_KEYBOARD_ROTATION_STEP_RAD };
  }

  if (key === "ArrowDown") {
    return { type: "rotate", thetaDelta: 0, phiDelta: RESULT_3D_KEYBOARD_ROTATION_STEP_RAD };
  }

  if (key === "+" || key === "=") {
    return { type: "zoom", scale: RESULT_3D_KEYBOARD_ZOOM_IN_SCALE };
  }

  if (key === "-") {
    return { type: "zoom", scale: RESULT_3D_KEYBOARD_ZOOM_OUT_SCALE };
  }

  if (key === "1") {
    return { type: "preset", preset: "isometric" };
  }

  if (key === "2") {
    return { type: "preset", preset: "top" };
  }

  if (key === "3") {
    return { type: "preset", preset: "front" };
  }

  if (key === "4") {
    return { type: "preset", preset: "side" };
  }

  if (key === "0") {
    return { type: "reset" };
  }

  if (key === "Escape") {
    return { type: "clearSelection" };
  }

  return null;
}
