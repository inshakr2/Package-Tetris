import type { PackedSpace } from "./types";

export type ChainComparisonMode = "original" | "preview";

export function resolveChainComparisonSpaces({
  mode,
  originalSpaces,
  previewSpaces
}: {
  mode: ChainComparisonMode;
  originalSpaces: PackedSpace[];
  previewSpaces: PackedSpace[] | null;
}) {
  if (mode === "preview" && previewSpaces?.length) {
    return previewSpaces;
  }

  return originalSpaces;
}
