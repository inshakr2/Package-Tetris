import { getProjectionViewLabel, type ProjectionView } from "./projection-view";

export type ResultViewControlId = ProjectionView | "three" | "reset";
export type ResultViewMode = Exclude<ResultViewControlId, "reset">;
export type ResultThreeCameraPreset = "isometric" | ProjectionView;

export interface ResultViewControlItem {
  id: ResultViewControlId;
  label: string;
  ariaLabel: string;
}

export interface ThreeCameraControlItem {
  preset: ResultThreeCameraPreset;
  label: string;
  ariaLabel: string;
}

export const RESULT_VIEW_TOUCH_TARGET_MIN_PX = 48;

export const RESULT_VIEW_CONTROL_ITEMS: ResultViewControlItem[] = [
  { id: "three", label: "3D", ariaLabel: "3D 보기" },
  { id: "top", label: "위", ariaLabel: "위 보기" },
  { id: "front", label: "앞", ariaLabel: "앞 보기" },
  { id: "side", label: "옆", ariaLabel: "옆 보기" },
  { id: "reset", label: "처음", ariaLabel: "처음 보기로 되돌리기" }
];

export const THREE_CAMERA_CONTROL_ITEMS: ThreeCameraControlItem[] = [
  { preset: "isometric", label: "사시", ariaLabel: "사시 카메라" },
  { preset: "top", label: "위", ariaLabel: "위 카메라" },
  { preset: "front", label: "앞", ariaLabel: "앞 카메라" },
  { preset: "side", label: "옆", ariaLabel: "옆 카메라" }
];

export function getResultViewTitle(view: ResultViewMode) {
  if (view === "three") {
    return "3D 보기";
  }

  return `${getProjectionViewLabel(view)} 보기`;
}

export function isProjectionViewControlId(id: ResultViewControlId): id is ProjectionView {
  return id === "top" || id === "front" || id === "side";
}
