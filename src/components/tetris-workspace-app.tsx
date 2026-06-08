"use client";

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  FileUp,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Truck
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { IndexedDbTetrisStorage } from "@/lib/persistence/indexed-db";
import {
  copyWorkspaceForNewFile,
  detectImportConflict,
  exportWorkspaceToJson,
  parseWorkspaceImport
} from "@/lib/persistence/json-transfer";
import {
  addBlockTemplateToDraft,
  createBlockTemplate,
  removeBlockTemplate,
  removeDraftBlockItem,
  resolveDraftBlocks,
  updateBlockTemplate,
  updateDraftBlockItemQuantity
} from "@/lib/workspace/block-library";
import {
  createOptimizationInput,
  createPlaceholderResultSummary,
  reviewExecutionReadiness,
  ReviewGateResult
} from "@/lib/workspace/review-gate";
import { getWorkspaceSectionTitle, WORKSPACE_SECTION_ORDER } from "@/lib/workspace/layout-sections";
import { calculateUsableSize, PRESET_SPACES } from "@/lib/workspace/presets";
import { createDefaultWorkspace } from "@/lib/workspace/workspace-factory";
import {
  BlockDefinition,
  BlockTemplate,
  ImportConflict,
  ImportConflictOption,
  SpaceDefinition,
  TetrisWorkspace
} from "@/lib/workspace/types";

type SaveStatus = "loading" | "saving" | "saved" | "error";

interface PendingImport {
  workspace: TetrisWorkspace;
  conflict: ImportConflict;
}

const DEFAULT_SPACE_FORM = {
  name: "커스텀 공간",
  widthMm: 1200,
  depthMm: 1000,
  heightMm: 1500,
  offsetWidthMm: 50,
  offsetDepthMm: 50,
  offsetHeightMm: 80
};

const DEFAULT_BLOCK_FORM = {
  name: "신규 블록",
  widthMm: 300,
  depthMm: 220,
  heightMm: 180,
  quantity: 10,
  fragile: false
};

type BlockForm = typeof DEFAULT_BLOCK_FORM;

export function TetrisWorkspaceApp() {
  const storage = useMemo(() => new IndexedDbTetrisStorage(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultStageRef = useRef<HTMLElement>(null);
  const [workspace, setWorkspace] = useState<TetrisWorkspace | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [spaceForm, setSpaceForm] = useState(DEFAULT_SPACE_FORM);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState(DEFAULT_BLOCK_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const restored = await storage.loadWorkspace();
        if (!cancelled) {
          setWorkspace(restored ? normalizeWorkspace(restored) : createDefaultWorkspace());
          setSaveStatus(restored ? "saved" : "saving");
        }
      } catch (error) {
        if (!cancelled) {
          setWorkspace(createDefaultWorkspace());
          setSaveStatus("error");
          setSaveError(toErrorMessage(error));
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [storage]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    setSaveStatus("saving");
    const timeoutId = window.setTimeout(async () => {
      try {
        await storage.saveWorkspace(workspace);
        setSaveStatus("saved");
        setSaveError(null);
      } catch (error) {
        setSaveStatus("error");
        setSaveError(toErrorMessage(error));
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [storage, workspace]);

  const allSpaces = useMemo(() => {
    return [...PRESET_SPACES, ...(workspace?.spaces ?? [])];
  }, [workspace?.spaces]);

  const selectedSpace = allSpaces.find((space) => space.spaceId === workspace?.draft.selectedSpaceId);
  const draftBlocks = workspace ? resolveDraftBlocks(workspace) : [];
  const review = workspace
    ? reviewExecutionReadiness({
        selectedSpace,
        blocks: draftBlocks,
        fragileStackOnFragileAllowed: workspace.policy.fragileStackOnFragileAllowed
      })
    : null;
  const latestResult = workspace?.recentResults[0] ?? null;
  const needsExport = Boolean(workspace && workspace.lastExportedAt !== workspace.updatedAt);

  function updateWorkspace(updater: (current: TetrisWorkspace, now: string) => TetrisWorkspace) {
    setWorkspace((current) => {
      if (!current) {
        return current;
      }
      const now = new Date().toISOString();
      return updater(current, now);
    });
  }

  function selectSpace(spaceId: string) {
    updateWorkspace((current, now) => ({
      ...current,
      revision: current.revision + 1,
      updatedAt: now,
      draft: {
        ...current.draft,
        selectedSpaceId: spaceId,
        currentStep: "space",
        updatedAt: now
      }
    }));
  }

  function saveSpace() {
    const now = new Date().toISOString();
    const nextSpace: SpaceDefinition = {
      spaceId: editingSpaceId ?? createClientId("space"),
      entityVersion: editingSpaceId
        ? (workspace?.spaces.find((space) => space.spaceId === editingSpaceId)?.entityVersion ?? 0) + 1
        : 1,
      name: spaceForm.name.trim() || "커스텀 공간",
      type: "custom",
      dimensions: {
        widthMm: Number(spaceForm.widthMm),
        depthMm: Number(spaceForm.depthMm),
        heightMm: Number(spaceForm.heightMm)
      },
      offset: {
        widthMm: Number(spaceForm.offsetWidthMm),
        depthMm: Number(spaceForm.offsetDepthMm),
        heightMm: Number(spaceForm.offsetHeightMm)
      },
      createdAt: workspace?.spaces.find((space) => space.spaceId === editingSpaceId)?.createdAt ?? now,
      updatedAt: now
    };

    updateWorkspace((current, touchedAt) => {
      const exists = current.spaces.some((space) => space.spaceId === nextSpace.spaceId);
      return {
        ...current,
        revision: current.revision + 1,
        updatedAt: touchedAt,
        spaces: exists
          ? current.spaces.map((space) => (space.spaceId === nextSpace.spaceId ? nextSpace : space))
          : [...current.spaces, nextSpace],
        draft: {
          ...current.draft,
          selectedSpaceId: nextSpace.spaceId,
          updatedAt: touchedAt
        }
      };
    });
    setEditingSpaceId(null);
    setSpaceForm(DEFAULT_SPACE_FORM);
  }

  function editSpace(space: SpaceDefinition) {
    setEditingSpaceId(space.spaceId);
    setSpaceForm({
      name: space.name,
      widthMm: space.dimensions.widthMm,
      depthMm: space.dimensions.depthMm,
      heightMm: space.dimensions.heightMm,
      offsetWidthMm: space.offset.widthMm,
      offsetDepthMm: space.offset.depthMm,
      offsetHeightMm: space.offset.heightMm
    });
  }

  function deleteSpace(spaceId: string) {
    updateWorkspace((current, now) => ({
      ...current,
      revision: current.revision + 1,
      updatedAt: now,
      spaces: current.spaces.filter((space) => space.spaceId !== spaceId),
      draft: {
        ...current.draft,
        selectedSpaceId:
          current.draft.selectedSpaceId === spaceId ? "preset-pallet-1150" : current.draft.selectedSpaceId,
        updatedAt: now
      }
    }));
  }

  function saveBlockTemplate(addToDraft: boolean) {
    if (editingTemplateId) {
      updateWorkspace((current, now) =>
        updateBlockTemplate(current, {
          blockTemplateId: editingTemplateId,
          name: blockForm.name.trim() || "신규 블록",
          dimensions: {
            widthMm: Number(blockForm.widthMm),
            depthMm: Number(blockForm.depthMm),
            heightMm: Number(blockForm.heightMm)
          },
          fragile: blockForm.fragile,
          now
        })
      );
      setEditingTemplateId(null);
      setBlockForm(DEFAULT_BLOCK_FORM);
      return;
    }

    const blockTemplateId = createClientId("template");
    updateWorkspace((current, now) =>
      createBlockTemplate(current, {
        blockTemplateId,
        name: blockForm.name.trim() || "신규 블록",
        dimensions: {
          widthMm: Number(blockForm.widthMm),
          depthMm: Number(blockForm.depthMm),
          heightMm: Number(blockForm.heightMm)
        },
        fragile: blockForm.fragile,
        quantity: Number(blockForm.quantity),
        addToDraft,
        now
      })
    );
    setBlockForm(DEFAULT_BLOCK_FORM);
  }

  function editBlockTemplate(template: BlockTemplate) {
    setEditingTemplateId(template.blockTemplateId);
    setBlockForm({
      name: template.name,
      widthMm: template.dimensions.widthMm,
      depthMm: template.dimensions.depthMm,
      heightMm: template.dimensions.heightMm,
      quantity: 1,
      fragile: template.fragile
    });
  }

  function addTemplateToDraft(template: BlockTemplate, quantity = 1) {
    updateWorkspace((current, now) =>
      addBlockTemplateToDraft(current, {
        draftBlockItemId: createClientId("item"),
        blockTemplateId: template.blockTemplateId,
        quantity,
        now
      })
    );
  }

  function deleteBlockTemplate(templateId: string) {
    updateWorkspace((current, now) =>
      removeBlockTemplate(current, {
        blockTemplateId: templateId,
        now
      })
    );
  }

  function updateCurrentQuantity(draftBlockItemId: string, quantity: number) {
    updateWorkspace((current, now) =>
      updateDraftBlockItemQuantity(current, {
        draftBlockItemId,
        quantity,
        now
      })
    );
  }

  function deleteCurrentBlockItem(draftBlockItemId: string) {
    updateWorkspace((current, now) =>
      removeDraftBlockItem(current, {
        draftBlockItemId,
        now
      })
    );
  }

  function createPlaceholderResult() {
    if (!workspace || !review) {
      return;
    }

    const optimizationInput = createOptimizationInput(review, createClientId("run"));
    const placeholderResult = createPlaceholderResultSummary(review, {
      resultId: createClientId("result"),
      createdAt: new Date().toISOString()
    });

    if (!optimizationInput || !placeholderResult) {
      return;
    }

    updateWorkspace((current, now) => ({
      ...current,
      revision: current.revision + 1,
      updatedAt: now,
      draft: {
        ...current.draft,
        currentStep: "result",
        updatedAt: now
      },
      recentResults: [
        {
          ...placeholderResult,
          createdAt: now
        },
        ...current.recentResults
      ].slice(0, 5)
    }));

    window.setTimeout(() => {
      resultStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultStageRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function exportJson() {
    if (!workspace) {
      return;
    }

    const exportedAt = new Date().toISOString();
    const workspaceForExport = {
      ...workspace,
      lastExportedAt: exportedAt,
      updatedAt: exportedAt
    };
    const json = exportWorkspaceToJson(workspaceForExport, exportedAt);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `my-tetris-library-${exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setWorkspace(workspaceForExport);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !workspace) {
      return;
    }

    try {
      const importedWorkspace = normalizeWorkspace(parseWorkspaceImport(await file.text()));
      setPendingImport({
        workspace: importedWorkspace,
        conflict: detectImportConflict(workspace, importedWorkspace)
      });
    } catch (error) {
      setSaveStatus("error");
      setSaveError(toErrorMessage(error));
    }
  }

  function resolveImport(option: ImportConflictOption) {
    if (!pendingImport || !workspace) {
      return;
    }

    if (option === "replace") {
      setWorkspace(
        normalizeWorkspace({
          ...pendingImport.workspace,
          deviceId: workspace.deviceId,
          updatedAt: new Date().toISOString()
        })
      );
    }

    if (option === "open-copy") {
      setWorkspace(
        normalizeWorkspace(
          copyWorkspaceForNewFile(pendingImport.workspace, {
            deviceId: workspace.deviceId,
            fileId: createClientId("file"),
            now: new Date().toISOString()
          })
        )
      );
    }

    setPendingImport(null);
  }

  if (!workspace) {
    return (
      <main className="app-shell">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <Truck size={18} />
            </span>
            <div>
              <h1>테트리스 적재 최적화</h1>
              <p>작업본을 불러오는 중입니다.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Truck size={18} />
          </span>
          <div>
            <h1>테트리스 적재 최적화</h1>
            <p>프론트 단독 · IndexedDB 작업본 · JSON 이동본</p>
          </div>
        </div>
        <div className="toolbar">
          <SaveStatusPill status={saveStatus} needsExport={needsExport} error={saveError} />
          <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={16} />
            가져오기
          </button>
          <button className="primary-button desktop-export" onClick={exportJson}>
            <Download size={16} />
            JSON 내보내기
          </button>
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept="application/json,.json"
            onChange={importJson}
          />
        </div>
      </header>

      <div className="workspace-stack">
        <div className="workflow-progress">
          <Stepper activeStep={workspace.draft.currentStep} />
        </div>

        <section className="panel workflow-section space-workflow-row" aria-labelledby="space-library-title">
          <SpaceLibraryPanel
            spaces={allSpaces}
            customSpaces={workspace.spaces}
            selectedSpaceId={workspace.draft.selectedSpaceId}
            selectedSpace={selectedSpace}
            form={spaceForm}
            editingSpaceId={editingSpaceId}
            onSelect={selectSpace}
            onFormChange={setSpaceForm}
            onSave={saveSpace}
            onEdit={editSpace}
            onDelete={deleteSpace}
            onCancelEdit={() => {
              setEditingSpaceId(null);
              setSpaceForm(DEFAULT_SPACE_FORM);
            }}
          />
        </section>

        <section className="panel workflow-section block-library-row" aria-labelledby="block-library-title">
          <div className="section-layout block-library-layout">
            <div className="section-column">
              <BlockCreatePanel
                form={blockForm}
                editingTemplateId={editingTemplateId}
                onChange={setBlockForm}
                onSave={(addToDraft) => saveBlockTemplate(addToDraft)}
                onCancel={() => {
                  setEditingTemplateId(null);
                  setBlockForm(DEFAULT_BLOCK_FORM);
                }}
              />
            </div>
            <div className="section-column">
              <BlockLibraryPanel
                templates={workspace.blockTemplates}
                onAddToDraft={addTemplateToDraft}
                onEdit={editBlockTemplate}
                onDelete={deleteBlockTemplate}
              />
            </div>
          </div>
        </section>

        <section className="panel workflow-section current-work-row" aria-labelledby="current-work-title">
          <div className="section-layout current-work-layout">
            <CurrentWorkBlocksPanel
              blocks={draftBlocks}
              onQuantityChange={updateCurrentQuantity}
              onDelete={deleteCurrentBlockItem}
            />
            <ReviewCompactCard
              selectedSpace={selectedSpace}
              review={review}
              needsExport={needsExport}
              onCreateResult={createPlaceholderResult}
            />
          </div>
        </section>

        <ResultStage
          ref={resultStageRef}
          latestResult={latestResult}
          selectedSpace={selectedSpace}
          review={review}
          draftBlocks={draftBlocks}
          pendingImport={pendingImport}
          onResolveImport={resolveImport}
        />
      </div>

      <div className="sticky-mobile-actions">
        <SaveStatusPill status={saveStatus} needsExport={needsExport} error={saveError} compact />
        <button className="primary-button" onClick={exportJson}>
          <Download size={16} />
          JSON
        </button>
      </div>
    </main>
  );
}

function SpaceLibraryPanel({
  spaces,
  customSpaces,
  selectedSpaceId,
  selectedSpace,
  form,
  editingSpaceId,
  onSelect,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancelEdit
}: {
  spaces: SpaceDefinition[];
  customSpaces: SpaceDefinition[];
  selectedSpaceId: string | null;
  selectedSpace: SpaceDefinition | undefined;
  form: typeof DEFAULT_SPACE_FORM;
  editingSpaceId: string | null;
  onSelect: (spaceId: string) => void;
  onFormChange: (value: typeof DEFAULT_SPACE_FORM) => void;
  onSave: () => void;
  onEdit: (space: SpaceDefinition) => void;
  onDelete: (spaceId: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <section className="workflow-row-content">
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          1
        </span>
        <div>
          <h2 id="space-library-title">{getWorkspaceSectionTitle("space")}</h2>
          <p className="panel-subtitle">preset 또는 커스텀 공간을 선택합니다. 트럭 preset은 2.5톤반입니다.</p>
        </div>
      </div>

      <div className="section-layout space-library-layout">
        <div className="section-column">
          <h3>공간 선택</h3>
          <div className="list library-card-grid" aria-label="공간 preset 및 커스텀 공간">
            {spaces.map((space) => (
              <button
                key={space.spaceId}
                className="library-card"
                aria-pressed={space.spaceId === selectedSpaceId}
                onClick={() => onSelect(space.spaceId)}
              >
                <span className="card-heading">
                  <strong>{space.name}</strong>
                  {space.isPreset ? <span className="badge">preset</span> : <span className="badge">custom</span>}
                </span>
                <span className="meta">{formatDimensions(space.dimensions)}</span>
                <span className="badge-row">
                  <span className="badge" data-tone="green">
                    usable {formatDimensions(calculateUsableSize(space))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="section-column">
          <SelectedSpaceSummary selectedSpace={selectedSpace} />

          <div className="section-divider" />
          <h3>{editingSpaceId ? "공간 수정" : "커스텀 공간 추가"}</h3>
          <SpaceForm value={form} onChange={onFormChange} />
          <div className="form-actions">
            <button className="primary-button" onClick={onSave}>
              <Plus size={16} />
              {editingSpaceId ? "공간 수정" : "공간 추가"}
            </button>
            {editingSpaceId ? (
              <button className="secondary-button" onClick={onCancelEdit}>
                <RotateCcw size={16} />
                취소
              </button>
            ) : null}
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
                    <button className="secondary-button" onClick={() => onEdit(space)}>
                      수정
                    </button>
                    <button className="danger-button" onClick={() => onDelete(space.spaceId)}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SelectedSpaceSummary({ selectedSpace }: { selectedSpace: SpaceDefinition | undefined }) {
  const usableSize = selectedSpace ? calculateUsableSize(selectedSpace) : null;

  return (
    <section className="selection-summary" aria-live="polite">
      <span className="badge" data-tone="green">
        선택된 공간
      </span>
      <strong>{selectedSpace?.name ?? "공간 미선택"}</strong>
      <p className="meta">
        {selectedSpace
          ? `${formatDimensions(selectedSpace.dimensions)} · ${selectedSpace.isPreset ? "preset" : "custom"}`
          : "공간을 선택하면 usable 크기와 offset을 확인할 수 있습니다."}
      </p>
      <div className="summary-grid compact-summary">
        <SummaryTile label="usable" value={usableSize ? formatDimensions(usableSize) : "-"} />
        <SummaryTile
          label="offset"
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

function BlockLibraryPanel({
  templates,
  onAddToDraft,
  onEdit,
  onDelete
}: {
  templates: BlockTemplate[];
  onAddToDraft: (template: BlockTemplate, quantity?: number) => void;
  onEdit: (template: BlockTemplate) => void;
  onDelete: (templateId: string) => void;
}) {
  return (
    <section className="rail-section block-template-library">
      <h3>저장된 블록</h3>
      <p className="panel-subtitle">저장된 커스텀 블록을 현재 작업에 재사용합니다.</p>
      <div className="list library-card-grid">
        {templates.length === 0 ? (
          <p className="fine-print">저장된 블록이 없습니다. 왼쪽 입력 영역에서 첫 블록을 저장하세요.</p>
        ) : (
          templates.map((template) => (
            <article key={template.blockTemplateId} className="library-card">
              <div className="card-heading">
                <strong>{template.name}</strong>
                {template.fragile ? <span className="badge" data-tone="amber">fragile</span> : <span className="badge">normal</span>}
              </div>
              <p className="meta">{formatDimensions(template.dimensions)} · v{template.entityVersion}</p>
              <div className="form-actions">
                <button className="primary-button" onClick={() => onAddToDraft(template, 1)}>
                  현재 작업에 추가
                </button>
                <button className="secondary-button" onClick={() => onEdit(template)}>
                  수정
                </button>
                <button className="danger-button" onClick={() => onDelete(template.blockTemplateId)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function BlockCreatePanel({
  form,
  editingTemplateId,
  onChange,
  onSave,
  onCancel
}: {
  form: BlockForm;
  editingTemplateId: string | null;
  onChange: (value: BlockForm) => void;
  onSave: (addToDraft: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <section>
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          2
        </span>
        <div>
          <h2 id="block-library-title">{getWorkspaceSectionTitle("blocks")}</h2>
          <p className="panel-subtitle">
            블록은 라이브러리에 저장한 뒤 현재 작업에 여러 번 재사용합니다. 수량은 현재 작업 항목별로 따로
            관리합니다.
          </p>
        </div>
      </div>
      <div className="form-grid block-template-form">
        <label>
          블록명
          <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
        </label>
        <label>
          가로(mm)
          <input
            inputMode="numeric"
            type="number"
            min="1"
            value={form.widthMm}
            onChange={(event) => onChange({ ...form, widthMm: Number(event.target.value) })}
          />
        </label>
        <label>
          세로(mm)
          <input
            inputMode="numeric"
            type="number"
            min="1"
            value={form.depthMm}
            onChange={(event) => onChange({ ...form, depthMm: Number(event.target.value) })}
          />
        </label>
        <label>
          높이(mm)
          <input
            inputMode="numeric"
            type="number"
            min="1"
            value={form.heightMm}
            onChange={(event) => onChange({ ...form, heightMm: Number(event.target.value) })}
          />
        </label>
        <label>
          기본 수량
          <input
            inputMode="numeric"
            type="number"
            min="1"
            value={form.quantity}
            onChange={(event) => onChange({ ...form, quantity: Number(event.target.value) })}
          />
        </label>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={form.fragile}
            onChange={(event) => onChange({ ...form, fragile: event.target.checked })}
          />
          fragile
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-button" onClick={() => onSave(true)}>
          <PackagePlus size={16} />
          {editingTemplateId ? "템플릿 수정" : "저장 후 작업에 추가"}
        </button>
        {!editingTemplateId ? (
          <button className="secondary-button" onClick={() => onSave(false)}>
            라이브러리에만 저장
          </button>
        ) : (
          <button className="secondary-button" onClick={onCancel}>
            <RotateCcw size={16} />
            취소
          </button>
        )}
      </div>
    </section>
  );
}

function CurrentWorkBlocksPanel({
  blocks,
  onQuantityChange,
  onDelete
}: {
  blocks: BlockDefinition[];
  onQuantityChange: (draftBlockItemId: string, quantity: number) => void;
  onDelete: (draftBlockItemId: string) => void;
}) {
  return (
    <section className="current-block-panel">
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          3
        </span>
        <div>
          <h2 id="current-work-title">{getWorkspaceSectionTitle("review")}</h2>
          <p className="panel-subtitle">라이브러리에서 가져온 블록입니다. 수량 변경은 이 작업에만 적용됩니다.</p>
        </div>
      </div>
      <div className="block-list">
        {blocks.length === 0 ? (
          <p className="fine-print">라이브러리에서 블록을 추가하거나 새 블록을 저장 후 작업에 추가하세요.</p>
        ) : (
          blocks.map((block) => (
            <article key={block.draftBlockItemId} className="block-card">
              <div className="block-summary-row">
                <div>
                  <strong>{block.name}</strong>
                  <p className="meta">{formatDimensions(block.dimensions)}</p>
                </div>
                <span className="badge" data-tone={block.fragile ? "amber" : undefined}>
                  {block.fragile ? "fragile" : "normal"}
                </span>
              </div>
              <div className="block-detail-grid">
                <label>
                  이번 작업 수량
                  <input
                    inputMode="numeric"
                    type="number"
                    min="1"
                    value={block.quantity}
                    onChange={(event) => onQuantityChange(block.draftBlockItemId, Number(event.target.value))}
                  />
                </label>
                <div className="summary-tile compact">
                  <span>총 부피</span>
                  <strong>{formatM3(calculateBlockVolumeM3(block))}</strong>
                </div>
                <button className="danger-button" onClick={() => onDelete(block.draftBlockItemId)}>
                  <Trash2 size={16} />
                  현재 작업에서 제거
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ReviewCompactCard({
  selectedSpace,
  review,
  needsExport,
  onCreateResult
}: {
  selectedSpace: SpaceDefinition | undefined;
  review: ReviewGateResult | null;
  needsExport: boolean;
  onCreateResult: () => void;
}) {
  const statusTone = review?.status === "error" ? "red" : review?.status === "warning" ? "amber" : "green";
  const statusLabel =
    review?.status === "error" ? "입력 보완 필요" : review?.status === "warning" ? "주의 후 실행 가능" : "실행 가능";
  const reviewMessages =
    review && review.messages.length > 0
      ? review.messages
      : [
          {
            code: "review-ready",
            level: "valid" as const,
            text: "입력 조건이 충족되었습니다. 결과 요약을 생성할 수 있습니다."
          }
        ];

  return (
    <section className="review-card">
      <h3>실행 전 검토</h3>
      <div className="review-status-banner" data-tone={statusTone}>
        <span className="badge" data-tone={statusTone}>
          {statusLabel}
        </span>
        <p className="fine-print">
          fragile끼리 적층 허용, fragile 위 non-fragile 적층 금지, 90도 직교 회전 기준으로 입력을 점검합니다.
        </p>
      </div>
      <div className="summary-grid compact-summary">
        <SummaryTile label="선택 공간" value={selectedSpace?.name ?? "미선택"} />
        <SummaryTile label="총 블록" value={`${review?.totals.totalBlockCount ?? 0}개`} />
        <SummaryTile label="블록 총 부피" value={formatM3(review?.totals.totalBlockVolumeM3 ?? 0)} />
        <SummaryTile label="공간 usable 부피" value={formatM3(review?.totals.usableSpaceVolumeM3 ?? 0)} />
        <SummaryTile label="예상 최소 공간 수" value={`${review?.totals.minimumSpaceCountLowerBound ?? 0}개`} />
      </div>
      <ul className="checklist compact-checklist">
        {reviewMessages.map((message) => (
          <li key={message.code} className="review-message" data-tone={message.level === "valid" ? "green" : message.level === "warning" ? "amber" : "red"}>
            {message.level === "error" ? (
              <AlertTriangle size={18} color="var(--red)" />
            ) : message.level === "warning" ? (
              <AlertTriangle size={18} color="var(--amber)" />
            ) : (
              <CheckCircle2 size={18} color="var(--green)" />
            )}
            {message.text}
          </li>
        ))}
        {needsExport ? (
          <li className="review-message" data-tone="amber">
            <AlertTriangle size={18} color="var(--amber)" />
            다른 기기에서 이어가려면 JSON 내보내기가 필요합니다.
          </li>
        ) : null}
      </ul>
      {review?.cta.disabledReason ? <p className="fine-print review-cta-hint">{review.cta.disabledReason}</p> : null}
      <div className="form-actions">
        <button
          className="primary-button"
          onClick={onCreateResult}
          disabled={review?.cta.disabled ?? true}
          title={review?.cta.disabledReason ?? undefined}
        >
          <Box size={16} />
          결과 요약 생성
        </button>
      </div>
    </section>
  );
}

const ResultStage = ({
  latestResult,
  selectedSpace,
  review,
  draftBlocks,
  pendingImport,
  onResolveImport,
  ref
}: {
  latestResult: TetrisWorkspace["recentResults"][number] | null;
  selectedSpace: SpaceDefinition | undefined;
  review: ReviewGateResult | null;
  draftBlocks: BlockDefinition[];
  pendingImport: PendingImport | null;
  onResolveImport: (option: ImportConflictOption) => void;
  ref: React.Ref<HTMLElement>;
}) => {
  return (
    <section className="panel result-stage" ref={ref} tabIndex={-1} data-has-result={Boolean(latestResult)}>
      <div className="result-stage-header">
        <div>
          <span className="badge" data-tone="green">
            메인 결과
          </span>
          <h2>{getWorkspaceSectionTitle("result")}</h2>
          <p className="panel-subtitle">
            실제 3D 엔진 연결 전까지는 입력 데이터 기반 요약과 큰 preview 영역을 제공합니다.
          </p>
        </div>
      </div>

      <div className="result-hero-grid">
        <SummaryTile label="사용 공간" value={latestResult ? `${latestResult.usedSpaceCount}개` : "-"} />
        <SummaryTile
          label="평균 적재율"
          value={latestResult ? `${Math.round(latestResult.averageUtilizationRate * 100)}%` : "-"}
        />
        <SummaryTile label="미적재" value={latestResult ? `${latestResult.unloadedBlockCount}개` : "-"} />
        <SummaryTile label="대상 공간" value={selectedSpace?.name ?? "미선택"} />
      </div>

      {latestResult ? (
        <div className="result-preview result-preview-large" tabIndex={0} aria-label="결과 3D placeholder">
          <strong>3D 결과 스테이지</strong>
          <span className="fine-print">
            결과 영역은 데스크톱에서 가장 큰 패널입니다. 후속 단계에서 Web Worker 최적화 엔진과 3D 렌더링을
            연결합니다.
          </span>
          <div className="preview-stack" aria-hidden="true">
            {draftBlocks.slice(0, 12).map((block, index) => (
              <span key={`${block.draftBlockItemId}-${index}`} style={{ "--i": index } as React.CSSProperties} />
            ))}
          </div>
          <div className="view-buttons">
            <button className="secondary-button">상면</button>
            <button className="secondary-button">정면</button>
            <button className="secondary-button">측면</button>
            <button className="secondary-button">
              <RotateCcw size={16} />
              리셋
            </button>
          </div>
        </div>
      ) : (
        <div className="result-preview result-preview-empty" tabIndex={0} aria-label="결과 대기 상태">
          <strong>결과 요약 대기</strong>
          <span className="fine-print">공간과 블록을 확인한 뒤 3번 영역에서 결과 요약을 생성하세요.</span>
        </div>
      )}

      <div className="result-lower-grid">
        <section className="sub-panel">
          <h3>입력 요약</h3>
          <p className="meta">
            현재 작업 블록 {review?.totals.totalBlockCount ?? 0}개 · 총 부피{" "}
            {formatM3(review?.totals.totalBlockVolumeM3 ?? 0)}
          </p>
        </section>
        <section className="sub-panel">
          <h3>추가 블록 시뮬레이션</h3>
          <p className="meta">체이닝 계산은 후속 엔진 연결 범위입니다.</p>
          <div className="badge-row">
            <span className="badge">기존 배치 잠금</span>
            <span className="badge">최대 적재 계산</span>
          </div>
        </section>
      </div>

      {pendingImport ? <ImportConflictPanel pendingImport={pendingImport} onResolve={onResolveImport} /> : null}
    </section>
  );
};

function Stepper({ activeStep }: { activeStep: string }) {
  return (
    <div className="stepper" aria-label="4단계 진행 표시">
      {WORKSPACE_SECTION_ORDER.map((section) => (
        <span key={section.sectionId} className="step" data-active={activeStep === section.sectionId}>
          {section.stepLabel}
        </span>
      ))}
    </div>
  );
}

function SaveStatusPill({
  status,
  needsExport,
  error,
  compact = false
}: {
  status: SaveStatus;
  needsExport: boolean;
  error: string | null;
  compact?: boolean;
}) {
  if (status === "error") {
    return (
      <span className="status-pill" data-tone="red" role="status" title={error ?? undefined}>
        <AlertTriangle size={16} />
        {compact ? "저장 실패" : "저장 실패 · JSON 내보내기 필요"}
      </span>
    );
  }

  if (status === "saving" || status === "loading") {
    return (
      <span className="status-pill" data-tone="amber" role="status">
        <Save size={16} />
        {status === "loading" ? "불러오는 중" : "저장 중"}
      </span>
    );
  }

  return (
    <span className="status-pill" data-tone={needsExport ? "amber" : "green"} role="status">
      <CheckCircle2 size={16} />
      {needsExport ? "자동저장됨 · 내보내기 필요" : "자동저장됨"}
    </span>
  );
}

function SpaceForm({
  value,
  onChange
}: {
  value: typeof DEFAULT_SPACE_FORM;
  onChange: (value: typeof DEFAULT_SPACE_FORM) => void;
}) {
  return (
    <div className="form-grid space-form">
      <label>
        공간명
        <input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </label>
      <label>
        가로(mm)
        <input
          inputMode="numeric"
          type="number"
          min="1"
          value={value.widthMm}
          onChange={(event) => onChange({ ...value, widthMm: Number(event.target.value) })}
        />
      </label>
      <label>
        세로(mm)
        <input
          inputMode="numeric"
          type="number"
          min="1"
          value={value.depthMm}
          onChange={(event) => onChange({ ...value, depthMm: Number(event.target.value) })}
        />
      </label>
      <label>
        높이(mm)
        <input
          inputMode="numeric"
          type="number"
          min="1"
          value={value.heightMm}
          onChange={(event) => onChange({ ...value, heightMm: Number(event.target.value) })}
        />
      </label>
      <label>
        offset 가로
        <input
          inputMode="numeric"
          type="number"
          min="0"
          value={value.offsetWidthMm}
          onChange={(event) => onChange({ ...value, offsetWidthMm: Number(event.target.value) })}
        />
      </label>
      <label>
        offset 세로
        <input
          inputMode="numeric"
          type="number"
          min="0"
          value={value.offsetDepthMm}
          onChange={(event) => onChange({ ...value, offsetDepthMm: Number(event.target.value) })}
        />
      </label>
      <label>
        offset 높이
        <input
          inputMode="numeric"
          type="number"
          min="0"
          value={value.offsetHeightMm}
          onChange={(event) => onChange({ ...value, offsetHeightMm: Number(event.target.value) })}
        />
      </label>
    </div>
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

function ImportConflictPanel({
  pendingImport,
  onResolve
}: {
  pendingImport: PendingImport;
  onResolve: (option: ImportConflictOption) => void;
}) {
  return (
    <div className="import-panel" role="alert">
      <strong>JSON 가져오기 확인</strong>
      <p className="fine-print">
        충돌 유형: {pendingImport.conflict.kind}. 현재 작업을 보존하거나, 가져온 파일로 대체하거나, 복사본으로 열 수
        있습니다.
      </p>
      <div className="form-actions">
        {pendingImport.conflict.options.includes("keep-current") ? (
          <button className="secondary-button" onClick={() => onResolve("keep-current")}>
            현재 작업 유지
          </button>
        ) : null}
        {pendingImport.conflict.options.includes("replace") ? (
          <button className="primary-button" onClick={() => onResolve("replace")}>
            대체
          </button>
        ) : null}
        {pendingImport.conflict.options.includes("open-copy") ? (
          <button className="secondary-button" onClick={() => onResolve("open-copy")}>
            복사본으로 열기
          </button>
        ) : null}
        <button className="secondary-button" onClick={() => onResolve("cancel")}>
          취소
        </button>
      </div>
    </div>
  );
}

function calculateBlockVolumeM3(block: BlockDefinition) {
  return dimensionsVolumeM3(block.dimensions) * block.quantity;
}

function dimensionsVolumeM3(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function formatDimensions(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return `${dimensions.widthMm} / ${dimensions.depthMm} / ${dimensions.heightMm}mm`;
}

function formatM3(value: number) {
  return `${value.toFixed(3)}m³`;
}

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeWorkspace(workspace: TetrisWorkspace): TetrisWorkspace {
  const legacyWorkspace = workspace as unknown as TetrisWorkspace & {
    blocks?: Array<BlockTemplate & { blockId?: string; quantity?: number }>;
    draft?: TetrisWorkspace["draft"] & { blockIds?: string[] };
  };

  if (workspace.blockTemplates && workspace.draft.blockItems) {
    return workspace;
  }

  const now = workspace.updatedAt ?? new Date().toISOString();
  const blockTemplates =
    legacyWorkspace.blocks?.map((block, index) => ({
      blockTemplateId: block.blockTemplateId ?? block.blockId ?? `legacy-template-${index + 1}`,
      entityVersion: block.entityVersion ?? 1,
      name: block.name,
      dimensions: block.dimensions,
      fragile: block.fragile,
      createdAt: block.createdAt ?? now,
      updatedAt: block.updatedAt ?? now
    })) ?? [];

  return {
    ...workspace,
    blockTemplates,
    draft: {
      ...workspace.draft,
      blockItems:
        legacyWorkspace.draft?.blockIds?.map((blockId, index) => {
          const block = legacyWorkspace.blocks?.find((candidate) => candidate.blockId === blockId);
          return {
            draftBlockItemId: `legacy-item-${blockId}-${index + 1}`,
            blockTemplateId: blockId,
            quantity: block?.quantity ?? 1,
            createdAt: block?.createdAt ?? now,
            updatedAt: block?.updatedAt ?? now
          };
        }) ?? []
    }
  };
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}
