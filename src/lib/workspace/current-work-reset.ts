import type { TetrisWorkspace } from "./types";

const DEFAULT_SELECTED_SPACE_ID = "preset-pallet-1150";

export function hasCurrentWorkToReset(workspace: TetrisWorkspace) {
  return (
    workspace.draft.selectedSpaceId !== DEFAULT_SELECTED_SPACE_ID ||
    workspace.draft.blockItems.length > 0 ||
    workspace.draft.currentStep !== "space" ||
    workspace.recentResults.length > 0 ||
    workspace.chainHistory.length > 0
  );
}

export function resetCurrentWorkspace(workspace: TetrisWorkspace, now: string): TetrisWorkspace {
  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: now,
    draft: {
      selectedSpaceId: DEFAULT_SELECTED_SPACE_ID,
      blockItems: [],
      currentStep: "space",
      updatedAt: now
    },
    recentResults: [],
    chainHistory: []
  };
}
