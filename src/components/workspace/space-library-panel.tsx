import { Plus, Trash2 } from "lucide-react";
import { getDeleteConfirmationCopy, type DeleteConfirmationKind } from "@/lib/workspace/delete-confirmation-copy";
import { formatDimensions } from "@/lib/workspace/dimension-format";
import { getWorkspaceSectionTitle } from "@/lib/workspace/layout-sections";
import { calculateUsableSize } from "@/lib/workspace/presets";
import type { SpaceDefinition } from "@/lib/workspace/types";
import { SelectedSpaceSummary } from "./selected-space-summary";

export function SpaceLibraryPanel({
  spaces,
  customSpaces,
  selectedSpaceId,
  selectedSpace,
  onSelect,
  onOpenAdd,
  onOpenEdit,
  onDeleteRequest
}: {
  spaces: SpaceDefinition[];
  customSpaces: SpaceDefinition[];
  selectedSpaceId: string | null;
  selectedSpace: SpaceDefinition | undefined;
  onSelect: (spaceId: string) => void;
  onOpenAdd: (trigger?: HTMLElement | null) => void;
  onOpenEdit: (space: SpaceDefinition, trigger?: HTMLElement | null) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  return (
    <section className="workflow-row-content">
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          1
        </span>
        <div>
          <h2 id="space-library-title">{getWorkspaceSectionTitle("space")}</h2>
          <p className="panel-subtitle">짐을 올릴 공간을 고릅니다. 트럭 기본값은 2.5톤반입니다.</p>
        </div>
      </div>

      <div className="section-layout space-library-layout">
        <div className="section-column">
          <h3>공간 선택</h3>
          <div className="list library-card-grid" aria-label="기본 공간 및 내 공간">
            {spaces.map((space) => (
              <button
                key={space.spaceId}
                className="library-card"
                aria-pressed={space.spaceId === selectedSpaceId}
                onClick={() => onSelect(space.spaceId)}
              >
                <span className="card-heading">
                  <strong>{space.name}</strong>
                  {space.isPreset ? <span className="badge">기본</span> : <span className="badge">내 공간</span>}
                </span>
                <span className="meta">{formatDimensions(space.dimensions)}</span>
                <span className="badge-row">
                  <span className="badge" data-tone="green">
                    적재 가능 {formatDimensions(calculateUsableSize(space))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="section-column">
          <SelectedSpaceSummary selectedSpace={selectedSpace} />

          <div className="section-divider" />
          <div className="space-library-actions">
            <div>
              <h3>내 공간</h3>
              <p className="panel-subtitle">기본값이 맞지 않을 때 직접 공간 크기와 안전 여유를 저장합니다.</p>
            </div>
            <button
              className="primary-button"
              onClick={(event) => onOpenAdd(event.currentTarget)}
            >
              <Plus size={16} />
              내 공간 추가
            </button>
          </div>

          {customSpaces.length > 0 ? (
            <div className="compact-list custom-space-list">
              <h3>내 공간 관리</h3>
              {customSpaces.map((space) => (
                <div key={space.spaceId} className="compact-row">
                  <span>
                    <strong>{space.name}</strong>
                    <small>{formatDimensions(space.dimensions)}</small>
                  </span>
                  <span className="row-actions">
                    <button
                      className="secondary-button"
                      onClick={(event) => onOpenEdit(space, event.currentTarget)}
                    >
                      수정
                    </button>
                    <button
                      className="danger-button"
                      aria-label={getDeleteConfirmationCopy("space", space.name).confirmLabel}
                      onClick={(event) => onDeleteRequest("space", space.spaceId, space.name, event.currentTarget)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="meta">직접 저장한 공간이 아직 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}
