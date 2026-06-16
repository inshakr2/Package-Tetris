import { formatDimensions } from "@/lib/workspace/dimension-format";
import { calculateUsableSize } from "@/lib/workspace/presets";
import type { SpaceDefinition } from "@/lib/workspace/types";

export function SelectedSpaceSummary({ selectedSpace }: { selectedSpace: SpaceDefinition | undefined }) {
  const usableSize = selectedSpace ? calculateUsableSize(selectedSpace) : null;

  return (
    <section className="selection-summary" aria-live="polite">
      <span className="badge" data-tone="green">
        선택된 공간
      </span>
      <strong>{selectedSpace?.name ?? "공간 미선택"}</strong>
      <p className="meta">
        {selectedSpace
          ? `${formatDimensions(selectedSpace.dimensions)} · ${selectedSpace.isPreset ? "기본 공간" : "내 공간"}`
          : "공간을 선택하면 실제 적재 가능 크기와 여유치를 확인할 수 있습니다."}
      </p>
      <div className="summary-grid compact-summary">
        <SummaryTile label="적재 가능 크기" value={usableSize ? formatDimensions(usableSize) : "-"} />
        <SummaryTile
          label="안전 여유"
          value={
            selectedSpace
              ? `${selectedSpace.offset.widthMm} / ${selectedSpace.offset.depthMm} / ${selectedSpace.offset.heightMm}mm`
              : "-"
          }
        />
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
