"use client";

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  FileUp,
  HardDrive,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  X
} from "lucide-react";
import dynamic from "next/dynamic";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IndexedDbTetrisStorage, WorkspaceSaveConflictError } from "@/lib/persistence/indexed-db";
import {
  copyWorkspaceForNewFile,
  detectImportConflict,
  exportWorkspaceToJson,
  parseWorkspaceImport
} from "@/lib/persistence/json-transfer";
import {
  readStorageHealth,
  requestStoragePersistence,
  shouldRemindExport,
  type PersistenceRequestResult,
  type StorageHealthSnapshot
} from "@/lib/persistence/storage-health";
import {
  createInitialWorkspaceSyncState,
  createLocalStorageSyncSignal,
  getActiveWorkspacePeerCount,
  reduceWorkspaceSyncState,
  shouldMarkWorkspaceStale,
  WORKSPACE_SYNC_CHANNEL_NAME,
  type WorkspaceRemoteSave,
  type WorkspaceSyncMessage,
  type WorkspaceSyncState
} from "@/lib/persistence/workspace-sync-channel";
import {
  addBlockTemplateToDraft,
  createBlockTemplate,
  removeBlockTemplate,
  removeDraftBlockItem,
  restoreDraftBlockItem,
  resolveDraftBlocks,
  updateBlockTemplate,
  updateDraftBlockItemQuantity
} from "@/lib/workspace/block-library";
import {
  createOptimizationInput,
  reviewExecutionReadiness,
  ReviewGateResult
} from "@/lib/workspace/review-gate";
import { runChainSimulationV0, type ChainSimulationOutput } from "@/lib/workspace/chain-simulation";
import {
  getDeleteConfirmationCopy,
  type DeleteConfirmationKind
} from "@/lib/workspace/delete-confirmation-copy";
import { getSpaceDialogCopy, type SpaceDialogMode } from "@/lib/workspace/space-dialog-copy";
import { validateSpaceForm } from "@/lib/workspace/space-form-validation";
import { runPackingEngineV0 } from "@/lib/workspace/packing-engine";
import {
  createProjectedBlocks,
  createProjectionLegendItems,
  getProjectionViewLabel,
  type ProjectionView
} from "@/lib/workspace/projection-view";
import {
  createPackingResultWarnings,
  SPACE_SPLIT_FLOOR_SUPPORT_WARNING
} from "@/lib/workspace/result-warnings";
import { getWorkspaceSectionTitle, WORKSPACE_SECTION_ORDER } from "@/lib/workspace/layout-sections";
import { createMobileStickyActionState } from "@/lib/workspace/mobile-sticky-action";
import { calculateUsableSize, PRESET_SPACES } from "@/lib/workspace/presets";
import { createPackedSpaceLoadSummary } from "@/lib/workspace/space-load-summary";
import { createDefaultWorkspace } from "@/lib/workspace/workspace-factory";
import {
  BlockDefinition,
  BlockTemplate,
  ChainHistoryItem,
  DraftBlockItem,
  ImportConflict,
  ImportConflictOption,
  SpaceDefinition,
  TetrisWorkspace
} from "@/lib/workspace/types";
import type { ThreeCameraPreset } from "./result-stage/result-3d-canvas.client";

type SaveStatus = "loading" | "saving" | "saved" | "error" | "conflict";
type ResultViewMode = "three" | ProjectionView;

interface PendingImport {
  workspace: TetrisWorkspace;
  conflict: ImportConflict;
}

interface WorkspaceSaveConflictNotice {
  storedRevision: number;
  incomingRevision: number;
  expectedRevision: number;
  storedUpdatedAt: string;
  source: "storage" | "remote";
}

interface PendingDelete {
  kind: DeleteConfirmationKind;
  entityId: string;
  name: string;
}

interface PendingDraftUndo {
  item: DraftBlockItem;
  blockName: string;
  index: number;
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
  name: "신규 박스",
  widthMm: 300,
  depthMm: 220,
  heightMm: 180,
  quantity: 10,
  fragile: false
};

type BlockForm = typeof DEFAULT_BLOCK_FORM;
const PROJECTION_VIEWS: ProjectionView[] = ["top", "front", "side"];
const THREE_CAMERA_PRESETS: Array<{ preset: ThreeCameraPreset; label: string }> = [
  { preset: "isometric", label: "사시" },
  { preset: "top", label: "위" },
  { preset: "front", label: "앞" },
  { preset: "side", label: "옆" }
];
const STORAGE_PANEL_ID = "storage-reliability-panel";

const Result3DCanvas = dynamic(
  () => import("./result-stage/result-3d-canvas.client").then((mod) => mod.Result3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="result-three-host" data-render-state="loading">
        <div className="projection-empty">
          <strong>3D 뷰 준비 중</strong>
          <span className="fine-print">3D 렌더러를 불러오고 있습니다.</span>
        </div>
      </div>
    )
  }
);

export function TetrisWorkspaceApp() {
  const storage = useMemo(() => new IndexedDbTetrisStorage(), []);
  const tabSessionId = useMemo(() => createClientId("tab"), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultStageRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<TetrisWorkspace | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const lastPersistedRevisionRef = useRef<number | null>(null);
  const lastSpaceDialogTriggerRef = useRef<HTMLElement | null>(null);
  const lastDeleteDialogTriggerRef = useRef<HTMLElement | null>(null);
  const [workspace, setWorkspace] = useState<TetrisWorkspace | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastLocalSavedAt, setLastLocalSavedAt] = useState<string | null>(null);
  const [lastPersistedRevision, setLastPersistedRevision] = useState<number | null>(null);
  const [saveConflict, setSaveConflict] = useState<WorkspaceSaveConflictNotice | null>(null);
  const [workspaceSyncState, setWorkspaceSyncState] = useState<WorkspaceSyncState>(() =>
    createInitialWorkspaceSyncState(tabSessionId)
  );
  const [storageHealth, setStorageHealth] = useState<StorageHealthSnapshot | null>(null);
  const [storagePanelOpen, setStoragePanelOpen] = useState(false);
  const [persistenceRequestResult, setPersistenceRequestResult] = useState<PersistenceRequestResult | null>(null);
  const [persistenceRequesting, setPersistenceRequesting] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingDraftUndo, setPendingDraftUndo] = useState<PendingDraftUndo | null>(null);
  const [spaceForm, setSpaceForm] = useState(DEFAULT_SPACE_FORM);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [spaceFormError, setSpaceFormError] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState(DEFAULT_BLOCK_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const refreshStorageHealth = useCallback(async () => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      return;
    }

    setStorageHealth(await readStorageHealth(navigator.storage, window.isSecureContext));
  }, []);

  const publishWorkspaceSyncMessage = useCallback((message: WorkspaceSyncMessage) => {
    syncChannelRef.current?.postMessage(message);

    if (typeof window === "undefined") {
      return;
    }

    try {
      const signal = createLocalStorageSyncSignal(message);
      window.localStorage.setItem(signal.key, signal.value);
    } catch {
      // localStorage fallback is best-effort only.
    }
  }, []);

  const handleWorkspaceSyncMessage = useCallback(
    (message: unknown) => {
      if (!isWorkspaceSyncMessage(message)) {
        return;
      }

      const receivedAt = new Date().toISOString();
      setWorkspaceSyncState((current) => reduceWorkspaceSyncState(current, message, receivedAt));

      if (message.tabId === tabSessionId) {
        return;
      }

      if (message.type === "tab-opened") {
        publishWorkspaceSyncMessage({
          type: "tab-present",
          tabId: tabSessionId,
          sentAt: receivedAt
        });
      }

      if (message.type !== "workspace-saved") {
        return;
      }

      const remoteSave: WorkspaceRemoteSave = {
        tabId: message.tabId,
        fileId: message.fileId,
        revision: message.revision,
        updatedAt: message.updatedAt,
        receivedAt
      };

      if (
        shouldMarkWorkspaceStale({
          fileId: workspaceRef.current?.fileId,
          lastPersistedRevision: lastPersistedRevisionRef.current,
          remoteSave
        })
      ) {
        setSaveStatus("conflict");
        setSaveConflict({
          storedRevision: message.revision,
          incomingRevision: workspaceRef.current?.revision ?? message.revision,
          expectedRevision: lastPersistedRevisionRef.current ?? 0,
          storedUpdatedAt: message.updatedAt,
          source: "remote"
        });
        setStoragePanelOpen(true);
      }
    },
    [publishWorkspaceSyncMessage, tabSessionId]
  );

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    lastPersistedRevisionRef.current = lastPersistedRevision;
  }, [lastPersistedRevision]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const markPresent = () =>
      publishWorkspaceSyncMessage({
        type: "tab-present",
        tabId: tabSessionId,
        sentAt: new Date().toISOString()
      });

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(WORKSPACE_SYNC_CHANNEL_NAME);
      channel.onmessage = (event) => handleWorkspaceSyncMessage(event.data);
      syncChannelRef.current = channel;
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_SYNC_CHANNEL_NAME || !event.newValue) {
        return;
      }

      try {
        handleWorkspaceSyncMessage(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed fallback signals from older tabs.
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    publishWorkspaceSyncMessage({
      type: "tab-opened",
      tabId: tabSessionId,
      sentAt: new Date().toISOString()
    });
    const heartbeatId = window.setInterval(markPresent, 5_000);

    return () => {
      window.clearInterval(heartbeatId);
      publishWorkspaceSyncMessage({
        type: "tab-closed",
        tabId: tabSessionId,
        sentAt: new Date().toISOString()
      });
      window.removeEventListener("storage", handleStorageEvent);
      syncChannelRef.current?.close();
      syncChannelRef.current = null;
    };
  }, [handleWorkspaceSyncMessage, publishWorkspaceSyncMessage, tabSessionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const restored = await storage.loadWorkspace();
        if (!cancelled) {
          const nextWorkspace = restored ? normalizeWorkspace(restored) : createDefaultWorkspace();
          setWorkspace(nextWorkspace);
          setSaveStatus(restored ? "saved" : "saving");
          setLastLocalSavedAt(restored?.updatedAt ?? null);
          setLastPersistedRevision(restored?.revision ?? null);
          setSaveConflict(null);
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
    void refreshStorageHealth();

    return () => {
      cancelled = true;
    };
  }, [refreshStorageHealth, storage]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    if (saveConflict) {
      return;
    }

    setSaveStatus("saving");
    const timeoutId = window.setTimeout(async () => {
      try {
        await storage.saveWorkspace(workspace, {
          expectedRevision: lastPersistedRevisionRef.current
        });
        setLastPersistedRevision(workspace.revision);
        setLastLocalSavedAt(new Date().toISOString());
        setSaveStatus("saved");
        setSaveError(null);
        publishWorkspaceSyncMessage({
          type: "workspace-saved",
          tabId: tabSessionId,
          sentAt: new Date().toISOString(),
          fileId: workspace.fileId,
          revision: workspace.revision,
          updatedAt: workspace.updatedAt
        });
        void refreshStorageHealth();
      } catch (error) {
        if (error instanceof WorkspaceSaveConflictError) {
          setSaveStatus("conflict");
          setSaveConflict({
            storedRevision: error.storedRevision,
            incomingRevision: error.incomingRevision,
            expectedRevision: error.expectedRevision,
            storedUpdatedAt: error.storedUpdatedAt,
            source: "storage"
          });
          setStoragePanelOpen(true);
          return;
        }

        setSaveStatus("error");
        setSaveError(toErrorMessage(error));
        setStoragePanelOpen(true);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [publishWorkspaceSyncMessage, refreshStorageHealth, saveConflict, storage, tabSessionId, workspace]);

  useEffect(() => {
    if (!storagePanelOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStoragePanelOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [storagePanelOpen]);

  useEffect(() => {
    if (!pendingDraftUndo || !workspace) {
      return;
    }

    const itemStillExists = workspace.draft.blockItems.some(
      (item) => item.draftBlockItemId === pendingDraftUndo.item.draftBlockItemId
    );

    if (itemStillExists) {
      setPendingDraftUndo(null);
    }
  }, [pendingDraftUndo, workspace]);

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
  const needsExport = Boolean(workspace && shouldRemindExport(workspace));
  const otherTabCount = getActiveWorkspacePeerCount(workspaceSyncState, new Date().toISOString());
  const isWorkspaceLocked = Boolean(saveConflict);
  const spaceDialogMode: SpaceDialogMode = editingSpaceId ? "edit" : "add";
  const hasBlockingDialog = spaceDialogOpen || Boolean(pendingDelete);
  const mobileStickyAction = useMemo(
    () =>
      createMobileStickyActionState({
        isWorkspaceLocked,
        hasResult: Boolean(latestResult),
        canCreateResult: Boolean(review && !review.cta.disabled),
        reviewCtaLabel: "결과 만들기",
        reviewCtaReason: review?.cta.disabledReason ?? null,
        saveStatus,
        needsExport
      }),
    [isWorkspaceLocked, latestResult, needsExport, review, saveStatus]
  );

  function updateWorkspace(updater: (current: TetrisWorkspace, now: string) => TetrisWorkspace) {
    setWorkspace((current) => {
      if (!current) {
        return current;
      }
      if (saveConflict) {
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
    if (!workspace || saveConflict) {
      return false;
    }

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
    return true;
  }

  function updateSpaceForm(nextForm: typeof DEFAULT_SPACE_FORM) {
    setSpaceForm(nextForm);
    setSpaceFormError(null);
  }

  function populateSpaceForm(space: SpaceDefinition) {
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

  function openAddSpaceDialog(trigger?: HTMLElement | null) {
    lastSpaceDialogTriggerRef.current = trigger ?? lastSpaceDialogTriggerRef.current;
    setEditingSpaceId(null);
    setSpaceForm(DEFAULT_SPACE_FORM);
    setSpaceFormError(null);
    setSpaceDialogOpen(true);
  }

  function openEditSpaceDialog(space: SpaceDefinition, trigger?: HTMLElement | null) {
    lastSpaceDialogTriggerRef.current = trigger ?? lastSpaceDialogTriggerRef.current;
    populateSpaceForm(space);
    setSpaceFormError(null);
    setSpaceDialogOpen(true);
  }

  function closeSpaceDialog() {
    setSpaceDialogOpen(false);
    setEditingSpaceId(null);
    setSpaceForm(DEFAULT_SPACE_FORM);
    setSpaceFormError(null);
    const trigger = lastSpaceDialogTriggerRef.current;

    if (trigger) {
      window.setTimeout(() => {
        trigger.focus();
      }, 0);
    }
  }

  function saveSpaceAndClose() {
    const validation = validateSpaceForm(spaceForm);

    if (!validation.valid) {
      setSpaceFormError(validation.message);
      return;
    }

    if (saveConflict) {
      setSpaceFormError("최신본을 불러온 뒤 내 공간을 저장할 수 있습니다.");
      return;
    }

    if (saveSpace()) {
      closeSpaceDialog();
    }
  }

  function requestDelete(kind: DeleteConfirmationKind, entityId: string, name: string, trigger?: HTMLElement | null) {
    if (kind === "draft-block") {
      deleteCurrentBlockItemWithUndo(entityId, name);
      return;
    }

    lastDeleteDialogTriggerRef.current = trigger ?? lastDeleteDialogTriggerRef.current;
    setPendingDelete({ kind, entityId, name });
  }

  function closeDeleteDialog() {
    setPendingDelete(null);
    const trigger = lastDeleteDialogTriggerRef.current;

    if (trigger) {
      window.setTimeout(() => {
        trigger.focus();
      }, 0);
    }
  }

  function confirmPendingDelete() {
    if (!pendingDelete) {
      return;
    }

    if (saveConflict) {
      return;
    }

    if (pendingDelete.kind === "space") {
      deleteSpace(pendingDelete.entityId);
    } else if (pendingDelete.kind === "block-template") {
      deleteBlockTemplate(pendingDelete.entityId);
    } else {
      deleteCurrentBlockItem(pendingDelete.entityId);
    }

    closeDeleteDialog();
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
          name: blockForm.name.trim() || "신규 박스",
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
        name: blockForm.name.trim() || "신규 박스",
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
    setPendingDraftUndo((current) => (current?.item.blockTemplateId === templateId ? null : current));
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

  function deleteCurrentBlockItemWithUndo(draftBlockItemId: string, blockName: string) {
    if (!workspace || saveConflict) {
      return;
    }

    const removedIndex = workspace.draft.blockItems.findIndex((item) => item.draftBlockItemId === draftBlockItemId);
    const removedItem = removedIndex >= 0 ? workspace.draft.blockItems[removedIndex] : null;

    if (!removedItem) {
      return;
    }

    setPendingDraftUndo({
      item: removedItem,
      blockName,
      index: removedIndex
    });

    updateWorkspace((current, now) => {
      const currentIndex = current.draft.blockItems.findIndex((item) => item.draftBlockItemId === draftBlockItemId);

      if (currentIndex < 0) {
        return current;
      }

      return removeDraftBlockItem(current, {
        draftBlockItemId,
        now
      });
    });
  }

  function closePendingDraftUndo() {
    setPendingDraftUndo(null);
  }

  function undoDraftBlockRemoval() {
    if (!pendingDraftUndo || saveConflict) {
      return;
    }

    const draftUndo = pendingDraftUndo;

    updateWorkspace((current, now) => {
      return restoreDraftBlockItem(current, {
        item: draftUndo.item,
        index: draftUndo.index,
        now
      });
    });
    setPendingDraftUndo(null);
  }

  function createPackingResult() {
    if (!workspace || !review) {
      return;
    }

    const resultId = createClientId("result");
    const optimizationInput = createOptimizationInput(review, createClientId("run"));

    if (!optimizationInput) {
      return;
    }

    const optimizationOutput = runPackingEngineV0(optimizationInput);
    const resultWarnings = createPackingResultWarnings({
      warnings: optimizationOutput.warnings,
      usedSpaceCount: optimizationOutput.usedSpaceCount,
      minimumSpaceCountLowerBound: review.totals.minimumSpaceCountLowerBound
    });

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
          resultId,
          runId: optimizationOutput.runId,
          createdAt: now,
          spaceSnapshot: optimizationInput.space,
          usedSpaceCount: optimizationOutput.usedSpaceCount,
          averageUtilizationRate: optimizationOutput.averageUtilizationRate,
          unloadedBlockCount: optimizationOutput.unloadedBlockCount,
          spaces: optimizationOutput.spaces,
          warnings: resultWarnings
        },
        ...current.recentResults
      ].slice(0, 5)
    }));

    window.setTimeout(() => {
      resultStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultStageRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function confirmChainSimulation(preview: ChainSimulationOutput, resultId: string) {
    if (preview.addedQuantity <= 0) {
      return;
    }

    updateWorkspace((current, now) => {
      const targetResult = current.recentResults.find((result) => result.resultId === resultId);

      if (!targetResult) {
        return current;
      }

      const chainHistoryItem: ChainHistoryItem = {
        chainId: createClientId("chain"),
        resultId,
        blockId: preview.blockTemplateId,
        blockTemplateId: preview.blockTemplateId,
        blockName: preview.blockName,
        addedQuantity: preview.addedQuantity,
        previousSpaces: targetResult.spaces,
        previousAverageUtilizationRate: targetResult.averageUtilizationRate,
        createdAt: now
      };

      return {
        ...current,
        revision: current.revision + 1,
        updatedAt: now,
        draft: {
          ...current.draft,
          currentStep: "chain",
          updatedAt: now
        },
        recentResults: current.recentResults.map((result) =>
          result.resultId === resultId
            ? {
                ...result,
                spaces: preview.spaces,
                usedSpaceCount: preview.spaces.length,
                averageUtilizationRate: preview.averageUtilizationRate
              }
            : result
        ),
        chainHistory: [chainHistoryItem, ...current.chainHistory]
      };
    });
  }

  function undoLastChainAddition(resultId: string) {
    updateWorkspace((current, now) => {
      const latestChainItem = current.chainHistory.find(
        (item) => item.resultId === resultId && item.previousSpaces?.length
      );

      if (!latestChainItem?.previousSpaces) {
        return current;
      }

      const previousSpaces = latestChainItem.previousSpaces;

      return {
        ...current,
        revision: current.revision + 1,
        updatedAt: now,
        draft: {
          ...current.draft,
          currentStep: "chain",
          updatedAt: now
        },
        recentResults: current.recentResults.map((result) =>
          result.resultId === resultId
            ? {
                ...result,
                spaces: previousSpaces,
                usedSpaceCount: previousSpaces.length,
                averageUtilizationRate:
                  latestChainItem.previousAverageUtilizationRate ?? result.averageUtilizationRate
              }
            : result
        ),
        chainHistory: current.chainHistory.filter((item) => item.chainId !== latestChainItem.chainId)
      };
    });
  }

  async function reloadLatestWorkspace() {
    try {
      const restored = await storage.loadWorkspace();
      const nextWorkspace = restored ? normalizeWorkspace(restored) : createDefaultWorkspace();
      setWorkspace(nextWorkspace);
      setLastPersistedRevision(restored?.revision ?? null);
      setLastLocalSavedAt(restored?.updatedAt ?? null);
      setSaveConflict(null);
      setSaveError(null);
      setSaveStatus(restored ? "saved" : "saving");
      setStoragePanelOpen(false);
    } catch (error) {
      setSaveStatus("error");
      setSaveError(toErrorMessage(error));
      setStoragePanelOpen(true);
    }
  }

  async function requestBrowserStorageProtection() {
    setPersistenceRequesting(true);
    try {
      const result = await requestStoragePersistence(
        typeof navigator === "undefined" ? undefined : navigator.storage,
        typeof window !== "undefined" && window.isSecureContext
      );
      setPersistenceRequestResult(result);

      const refreshed = await readStorageHealth(
        typeof navigator === "undefined" ? undefined : navigator.storage,
        typeof window !== "undefined" && window.isSecureContext
      );
      setStorageHealth({
        ...refreshed,
        persistenceState:
          result === "denied" || result === "error" || result === "unsupported"
            ? result
            : refreshed.persistenceState
      });
    } finally {
      setPersistenceRequesting(false);
    }
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

  function runMobileStickyAction() {
    if (mobileStickyAction.disabled) {
      return;
    }

    if (mobileStickyAction.action === "reload") {
      reloadLatestWorkspace();
      return;
    }

    if (mobileStickyAction.action === "create") {
      createPackingResult();
      return;
    }

    exportJson();
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
    <main className="app-shell" data-overlay-open={hasBlockingDialog ? "true" : undefined}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Truck size={18} />
          </span>
                  <div>
                    <h1>테트리스 적재 최적화</h1>
                    <p>이 기기에 자동 저장 · 백업 파일로 이동 가능</p>
                  </div>
                </div>
        <div className="toolbar">
          <div className="storage-status-wrapper">
            <SaveStatusPill
              status={saveStatus}
              needsExport={needsExport}
              error={saveError}
              saveConflict={saveConflict}
              otherTabCount={otherTabCount}
              expanded={storagePanelOpen}
              controls={STORAGE_PANEL_ID}
              onClick={() => setStoragePanelOpen((open) => !open)}
            />
          </div>
          <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={16} />
            백업 파일 가져오기
          </button>
                  <button className="primary-button desktop-export" onClick={exportJson}>
                    <Download size={16} />
                    백업 파일 만들기
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

      {storagePanelOpen ? (
        <StorageReliabilityPanel
          id={STORAGE_PANEL_ID}
          workspace={workspace}
          status={saveStatus}
          needsExport={needsExport}
          error={saveError}
          lastLocalSavedAt={lastLocalSavedAt}
          storageHealth={storageHealth}
          saveConflict={saveConflict}
          otherTabCount={otherTabCount}
          persistenceRequestResult={persistenceRequestResult}
          persistenceRequesting={persistenceRequesting}
          onClose={() => setStoragePanelOpen(false)}
          onExportJson={exportJson}
          onReloadLatestWorkspace={reloadLatestWorkspace}
          onRequestStorageProtection={requestBrowserStorageProtection}
        />
      ) : null}

      <div className="workspace-stack" data-readonly={isWorkspaceLocked}>
        {isWorkspaceLocked ? (
          <div className="workspace-readonly-banner" role="alert">
            <strong>다른 탭에서 최신 작업본이 저장되었습니다.</strong>
            <span>충돌 방지를 위해 이 탭의 입력과 실행을 잠시 막았습니다.</span>
          </div>
        ) : null}
        <div className="workflow-progress">
          <Stepper activeStep={workspace.draft.currentStep} />
        </div>

        <section className="panel workflow-section space-workflow-row" aria-labelledby="space-library-title">
          <SpaceLibraryPanel
            spaces={allSpaces}
            customSpaces={workspace.spaces}
            selectedSpaceId={workspace.draft.selectedSpaceId}
            selectedSpace={selectedSpace}
            onSelect={selectSpace}
            onOpenAdd={openAddSpaceDialog}
            onOpenEdit={openEditSpaceDialog}
            onDeleteRequest={requestDelete}
          />
        </section>

        <SpaceFormDialog
          open={spaceDialogOpen}
          mode={spaceDialogMode}
          value={spaceForm}
          error={spaceFormError}
          saveDisabled={isWorkspaceLocked}
          saveDisabledReason={isWorkspaceLocked ? "최신본을 불러온 뒤 내 공간을 저장할 수 있습니다." : null}
          onChange={updateSpaceForm}
          onClose={closeSpaceDialog}
          onSave={saveSpaceAndClose}
        />

        <DeleteConfirmDialog
          pendingDelete={pendingDelete}
          confirmDisabled={isWorkspaceLocked}
          confirmDisabledReason={isWorkspaceLocked ? "최신본을 불러온 뒤 삭제할 수 있습니다." : null}
          onClose={closeDeleteDialog}
          onConfirm={confirmPendingDelete}
        />

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
                onDeleteRequest={requestDelete}
              />
            </div>
          </div>
        </section>

        <section className="panel workflow-section current-work-row" aria-labelledby="current-work-title">
          <div className="section-layout current-work-layout">
            <CurrentWorkBlocksPanel
              blocks={draftBlocks}
              onQuantityChange={updateCurrentQuantity}
              onDeleteRequest={requestDelete}
            />
            <ReviewCompactCard
              selectedSpace={selectedSpace}
              review={review}
              needsExport={needsExport}
              storageHealth={storageHealth}
              saveConflict={saveConflict}
              otherTabCount={otherTabCount}
              persistenceRequesting={persistenceRequesting}
              onExportJson={exportJson}
              onReloadLatestWorkspace={reloadLatestWorkspace}
              onRequestStorageProtection={requestBrowserStorageProtection}
              onCreateResult={createPackingResult}
            />
          </div>
        </section>

                <ResultStage
                  ref={resultStageRef}
                  latestResult={latestResult}
          selectedSpace={selectedSpace}
          workspacePolicy={workspace.policy}
          review={review}
          draftBlocks={draftBlocks}
          chainHistory={workspace.chainHistory}
                  pendingImport={pendingImport}
                  onResolveImport={resolveImport}
                  onExportJson={exportJson}
                  onCreateResult={createPackingResult}
                  onConfirmChainSimulation={confirmChainSimulation}
                  onUndoLastChainAddition={undoLastChainAddition}
                />
      </div>

      {pendingDraftUndo ? (
        <DraftUndoToast
          blockName={pendingDraftUndo.blockName}
          undoDisabled={Boolean(saveConflict)}
          undoDisabledReason={
            saveConflict ? "최신본을 불러온 뒤에만 되돌릴 수 있습니다." : null
          }
          onUndo={undoDraftBlockRemoval}
          onClose={closePendingDraftUndo}
        />
      ) : null}

      <div className="sticky-mobile-actions">
        <div className="sticky-mobile-summary" data-tone={mobileStickyAction.tone}>
          <SaveStatusPill
            status={saveStatus}
            needsExport={needsExport}
            error={saveError}
            compact
            saveConflict={saveConflict}
            otherTabCount={otherTabCount}
            expanded={storagePanelOpen}
            controls={STORAGE_PANEL_ID}
            onClick={() => setStoragePanelOpen((open) => !open)}
          />
          <div className="sticky-mobile-copy">
            <strong>{mobileStickyAction.statusLabel}</strong>
            <span>{mobileStickyAction.helperLabel}</span>
          </div>
        </div>
        <button
          className="primary-button sticky-mobile-primary"
          onClick={runMobileStickyAction}
          disabled={mobileStickyAction.disabled}
        >
          {mobileStickyAction.action === "reload" ? (
            <RotateCcw size={16} />
          ) : mobileStickyAction.action === "create" ? (
            <Box size={16} />
          ) : (
            <Download size={16} />
          )}
          <span>{mobileStickyAction.buttonLabel}</span>
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

function BlockLibraryPanel({
  templates,
  onAddToDraft,
  onEdit,
  onDeleteRequest
}: {
  templates: BlockTemplate[];
  onAddToDraft: (template: BlockTemplate, quantity?: number) => void;
  onEdit: (template: BlockTemplate) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  return (
    <section className="rail-section block-template-library">
      <h3>저장된 박스</h3>
              <p className="panel-subtitle">저장한 박스를 현재 작업에 다시 사용합니다.</p>
      <div className="list library-card-grid">
                {templates.length === 0 ? (
                  <p className="fine-print">저장된 박스가 없습니다. 왼쪽 입력 영역에서 첫 박스를 저장하세요.</p>
        ) : (
          templates.map((template) => (
            <article key={template.blockTemplateId} className="library-card">
              <div className="card-heading">
                <strong>{template.name}</strong>
                        {template.fragile ? <span className="badge" data-tone="amber">깨짐주의</span> : <span className="badge">일반</span>}
              </div>
              <p className="meta">{formatDimensions(template.dimensions)} · v{template.entityVersion}</p>
              <div className="form-actions">
                <button className="primary-button" onClick={() => onAddToDraft(template, 1)}>
                          이번 작업에 추가
                </button>
                <button className="secondary-button" onClick={() => onEdit(template)}>
                  수정
                </button>
                <button
                  className="danger-button"
                  onClick={(event) =>
                    onDeleteRequest("block-template", template.blockTemplateId, template.name, event.currentTarget)
                  }
                >
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
                  <p className="panel-subtitle">박스 크기와 수량을 입력합니다. 저장한 박스는 다음 작업에도 다시 쓸 수 있습니다.</p>
        </div>
      </div>
      <div className="form-grid block-template-form">
        <label>
          박스명
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
                  깨짐주의
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-button" onClick={() => onSave(true)}>
          <PackagePlus size={16} />
                  {editingTemplateId ? "박스 수정" : "저장 후 이번 작업에 추가"}
        </button>
        {!editingTemplateId ? (
          <button className="secondary-button" onClick={() => onSave(false)}>
                    저장만 하기
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
  onDeleteRequest
}: {
  blocks: BlockDefinition[];
  onQuantityChange: (draftBlockItemId: string, quantity: number) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  return (
    <section className="current-block-panel">
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          3
        </span>
        <div>
          <h2 id="current-work-title">{getWorkspaceSectionTitle("review")}</h2>
                  <p className="panel-subtitle">이번에 실을 박스입니다. 수량 변경은 현재 작업에만 적용됩니다.</p>
        </div>
      </div>
      <div className="block-list">
        {blocks.length === 0 ? (
                  <p className="fine-print">박스를 추가하거나 새 박스를 저장 후 이번 작업에 추가하세요.</p>
        ) : (
          blocks.map((block) => (
            <article key={block.draftBlockItemId} className="block-card">
              <div className="block-summary-row">
                <div>
                  <strong>{block.name}</strong>
                  <p className="meta">{formatDimensions(block.dimensions)}</p>
                </div>
                <span className="badge" data-tone={block.fragile ? "amber" : undefined}>
                          {block.fragile ? "깨짐주의" : "일반"}
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
                <button
                  className="danger-button"
                  onClick={(event) =>
                    onDeleteRequest("draft-block", block.draftBlockItemId, block.name, event.currentTarget)
                  }
                >
                  <Trash2 size={16} />
                          이번 작업에서 제거
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function DraftUndoToast({
  blockName,
  undoDisabled,
  undoDisabledReason,
  onUndo,
  onClose
}: {
  blockName: string;
  undoDisabled: boolean;
  undoDisabledReason: string | null;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="draft-undo-toast" data-tone={undoDisabled ? "amber" : "green"}>
      <div className="draft-undo-toast-copy" role="status" aria-live="polite">
        <strong>이번 작업에서 제거했습니다.</strong>
        <span>{undoDisabledReason ?? blockName}</span>
      </div>
      <div className="draft-undo-toast-actions">
        <button className="secondary-button" onClick={onUndo} disabled={undoDisabled}>
          <RotateCcw size={16} />
          되돌리기
        </button>
        <button className="icon-button panel-close-button" onClick={onClose} aria-label="되돌리기 안내 닫기">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ReviewCompactCard({
  selectedSpace,
  review,
  needsExport,
  storageHealth,
  saveConflict,
  otherTabCount,
  persistenceRequesting,
  onExportJson,
  onReloadLatestWorkspace,
  onRequestStorageProtection,
  onCreateResult
}: {
  selectedSpace: SpaceDefinition | undefined;
  review: ReviewGateResult | null;
  needsExport: boolean;
  storageHealth: StorageHealthSnapshot | null;
  saveConflict: WorkspaceSaveConflictNotice | null;
  otherTabCount: number;
  persistenceRequesting: boolean;
  onExportJson: () => void;
  onReloadLatestWorkspace: () => void;
  onRequestStorageProtection: () => void;
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
                    text: "입력 조건이 충족되었습니다. 결과를 만들 수 있습니다."
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
                  깨짐주의끼리 쌓기 허용, 깨짐주의 위 일반 박스 쌓기 금지, 90도 회전 기준으로 입력을 확인합니다. 부피 기준 최소 공간 수는 참고 최소값이며, 실제로는 받쳐 주는 바닥과 쌓는 규칙 때문에 더 늘어날 수 있습니다.
        </p>
      </div>
      <div className="summary-grid compact-summary">
        <SummaryTile label="선택 공간" value={selectedSpace?.name ?? "미선택"} />
        <SummaryTile label="총 박스" value={`${review?.totals.totalBlockCount ?? 0}개`} />
        <SummaryTile label="박스 총 부피" value={formatM3(review?.totals.totalBlockVolumeM3 ?? 0)} />
                <SummaryTile label="공간 적재 가능 부피" value={formatM3(review?.totals.usableSpaceVolumeM3 ?? 0)} />
        <SummaryTile label="부피 기준 최소 공간 수" value={`${review?.totals.minimumSpaceCountLowerBound ?? 0}개`} />
      </div>
      <ul className="checklist compact-checklist">
        {saveConflict ? (
          <li className="review-message" data-tone="red">
            <AlertTriangle size={18} color="var(--red)" />
            <span className="review-message-content">
              다른 탭에서 최신 작업본이 저장되었습니다. 이 탭에서는 결과 생성과 입력 변경을 할 수 없습니다.
              <button className="inline-action" onClick={onReloadLatestWorkspace}>
                최신본 불러오기
              </button>
            </span>
          </li>
        ) : otherTabCount > 0 ? (
          <li className="review-message" data-tone="amber">
            <AlertTriangle size={18} color="var(--amber)" />
            다른 탭도 열려 있습니다. 편집은 이 탭에서만 계속하는 것이 안전합니다.
          </li>
        ) : null}
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
            <span className="review-message-content">
                      다른 기기에서 이어가거나 복구하려면 백업 파일을 최신으로 유지하세요.
                      <button className="inline-action" onClick={onExportJson}>
                        백업 만들기
                      </button>
            </span>
          </li>
        ) : null}
        {storageHealth?.persistSupported && storageHealth.persistenceState !== "persisted" ? (
          <li className="review-message" data-tone="amber">
            <ShieldCheck size={18} color="var(--amber)" />
            <span className="review-message-content">
                      브라우저 정리로 작업본이 지워질 가능성을 줄이려면 작업 보호 강화를 권장합니다.
              <button
                className="inline-action"
                onClick={onRequestStorageProtection}
                disabled={persistenceRequesting}
              >
                {persistenceRequesting ? "요청 중" : "보호 강화"}
              </button>
            </span>
          </li>
        ) : null}
      </ul>
      {review?.cta.disabledReason ? <p className="fine-print review-cta-hint">{review.cta.disabledReason}</p> : null}
      <div className="form-actions">
        <button
          className="primary-button"
          onClick={onCreateResult}
          disabled={Boolean(saveConflict) || (review?.cta.disabled ?? true)}
          title={saveConflict ? "최신 작업본을 불러온 뒤 실행할 수 있습니다." : (review?.cta.disabledReason ?? undefined)}
        >
          <Box size={16} />
                  결과 만들기
        </button>
      </div>
    </section>
  );
}

const ResultStage = ({
  latestResult,
  selectedSpace,
  workspacePolicy,
  review,
  draftBlocks,
  chainHistory,
          pendingImport,
          onResolveImport,
          onExportJson,
          onCreateResult,
          onConfirmChainSimulation,
          onUndoLastChainAddition,
          ref
}: {
  latestResult: TetrisWorkspace["recentResults"][number] | null;
  selectedSpace: SpaceDefinition | undefined;
  workspacePolicy: TetrisWorkspace["policy"];
  review: ReviewGateResult | null;
  draftBlocks: BlockDefinition[];
  chainHistory: ChainHistoryItem[];
          pendingImport: PendingImport | null;
          onResolveImport: (option: ImportConflictOption) => void;
          onExportJson: () => void;
          onCreateResult: () => void;
          onConfirmChainSimulation: (preview: ChainSimulationOutput, resultId: string) => void;
          onUndoLastChainAddition: (resultId: string) => void;
          ref: React.Ref<HTMLElement>;
}) => {
  const [projectionView, setProjectionView] = useState<ProjectionView>("top");
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>("three");
  const [threeCameraPreset, setThreeCameraPreset] = useState<ThreeCameraPreset>("isometric");
  const [threeResetToken, setThreeResetToken] = useState(0);
  const [selectedSpaceInstanceId, setSelectedSpaceInstanceId] = useState<string | null>(null);
  const [selectedBlockTemplateId, setSelectedBlockTemplateId] = useState<string | null>(null);
  const [selectedChainTemplateId, setSelectedChainTemplateId] = useState<string | null>(null);
  const [chainPreview, setChainPreview] = useState<ChainSimulationOutput | null>(null);
  const [chainStatus, setChainStatus] = useState<"idle" | "calculating" | "preview" | "empty" | "error">("idle");
  const [chainStatusMessage, setChainStatusMessage] = useState("추가할 박스 1개를 선택하세요.");
  const packedSpaces = latestResult?.spaces ?? [];
  const displayedSpaces = chainPreview?.spaces ?? packedSpaces;
  const selectedPackedSpace =
    displayedSpaces.find((space) => space.spaceInstanceId === selectedSpaceInstanceId) ?? displayedSpaces[0] ?? null;
  const selectedPackedSpaceIndex = selectedPackedSpace
    ? Math.max(
        0,
        displayedSpaces.findIndex((space) => space.spaceInstanceId === selectedPackedSpace.spaceInstanceId)
      )
    : -1;
  const resultSpace = latestResult?.spaceSnapshot ?? selectedSpace;
  const usableSize = resultSpace ? calculateUsableSize(resultSpace) : null;
  const chainBlockOptions = useMemo(() => createChainBlockOptions(draftBlocks), [draftBlocks]);
  const selectedChainTemplate =
    chainBlockOptions.find((template) => template.blockTemplateId === selectedChainTemplateId) ?? null;
  const latestResultChainHistory = latestResult
    ? chainHistory.filter((item) => item.resultId === latestResult.resultId)
    : [];
  const latestChainItem = latestResultChainHistory[0] ?? null;
  const chainPreviewBlockIds = useMemo(() => {
    if (!chainPreview) {
      return new Set<string>();
    }

    return new Set(
      chainPreview.spaces.flatMap((space) =>
        space.blocks.filter((block) => block.blockId.startsWith(chainPreview.runId)).map((block) => block.blockId)
      )
    );
  }, [chainPreview]);
  const projectedBlocks = useMemo(() => {
    if (!selectedPackedSpace || !usableSize) {
      return [];
    }

    return createProjectedBlocks(selectedPackedSpace.blocks, projectionView, usableSize);
  }, [projectionView, selectedPackedSpace, usableSize]);
  const legendItems = useMemo(() => createProjectionLegendItems(projectedBlocks), [projectedBlocks]);
  const selectedLegendItem =
    legendItems.find((item) => item.blockTemplateId === selectedBlockTemplateId) ?? null;
  const visibleBlockCount = selectedBlockTemplateId
    ? projectedBlocks.filter((block) => block.blockTemplateId === selectedBlockTemplateId).length
    : projectedBlocks.length;
  const displayedSpaceSummaries = useMemo(
    () =>
      new Map(
        displayedSpaces.map((space) => [space.spaceInstanceId, createPackedSpaceLoadSummary(space)] as const)
      ),
    [displayedSpaces]
  );
  const latestResultSpaceSummaries = useMemo(
    () =>
      new Map(
        (latestResult?.spaces ?? []).map((space) => [space.spaceInstanceId, createPackedSpaceLoadSummary(space)] as const)
      ),
    [latestResult?.spaces]
  );
  const safetySpaceSplitWarning =
    latestResult?.warnings?.find((warning) => warning === SPACE_SPLIT_FLOOR_SUPPORT_WARNING) ?? null;
  const resultWarnings =
    latestResult?.warnings?.filter((warning) => warning !== SPACE_SPLIT_FLOOR_SUPPORT_WARNING) ?? [];

  useEffect(() => {
    setResultViewMode("three");
    setThreeCameraPreset("isometric");
    setThreeResetToken((value) => value + 1);
    setProjectionView("top");
    setSelectedSpaceInstanceId(latestResult?.spaces?.[0]?.spaceInstanceId ?? null);
    setSelectedBlockTemplateId(null);
    setSelectedChainTemplateId(null);
    setChainPreview(null);
    setChainStatus("idle");
    setChainStatusMessage("추가할 박스 1개를 선택하세요.");
  }, [latestResult?.resultId]);

  function toggleSelectedBlockTemplate(blockTemplateId: string) {
    setSelectedBlockTemplateId((current) => (current === blockTemplateId ? null : blockTemplateId));
  }

  function clearSelectedBlockTemplate() {
    setSelectedBlockTemplateId(null);
  }

  function selectProjectionView(view: ProjectionView) {
    setResultViewMode(view);
    setProjectionView(view);
  }

  function resetResultViewer() {
    if (resultViewMode === "three") {
      setThreeCameraPreset("isometric");
      setThreeResetToken((value) => value + 1);
    } else {
      setProjectionView("top");
      setResultViewMode("top");
    }

    setSelectedBlockTemplateId(null);
  }

  function selectChainTemplate(blockTemplateId: string) {
    setSelectedChainTemplateId(blockTemplateId);
    setChainPreview(null);
    setChainStatus("idle");
    setSelectedBlockTemplateId(null);
    setChainStatusMessage(
      chainPreview ? "다른 박스를 선택해서 미리보기를 새로 계산합니다." : "최대 적재 계산을 실행하세요."
    );
  }

  function calculateChainPreview() {
    if (!latestResult || !selectedChainTemplate) {
      setChainStatus("idle");
      setChainStatusMessage("박스를 선택해야 계산할 수 있습니다.");
      return;
    }

    setChainStatus("calculating");
    setChainStatusMessage("남은 공간 기준으로 계산하고 있습니다.");

    window.setTimeout(() => {
      try {
        const preview = runChainSimulationV0({
          result: latestResult,
          blockTemplate: selectedChainTemplate,
          runId: createClientId("chain-run"),
          policy: {
            fragileStackOnFragileAllowed: workspacePolicy.fragileStackOnFragileAllowed,
            nonFragileOnFragileAllowed: false
          }
        });

        if (preview.warnings.length > 0) {
          setChainPreview(null);
          setSelectedBlockTemplateId(null);
          setChainStatus("error");
          setChainStatusMessage(preview.warnings[0] ?? "추가 적재 계산에 실패했습니다. 결과를 다시 확인하세요.");
          return;
        }

        setChainPreview(preview);
        setSelectedBlockTemplateId(preview.blockTemplateId);

        if (preview.addedQuantity > 0) {
          setChainStatus("preview");
          setChainStatusMessage(`${preview.blockName} 최대 ${preview.addedQuantity}개 추가 가능`);
          return;
        }

        setChainStatus("empty");
        setChainStatusMessage(`${preview.blockName}은 현재 결과에 더 들어가지 않습니다.`);
      } catch {
        setChainPreview(null);
        setChainStatus("error");
        setChainStatusMessage("추가 적재 계산에 실패했습니다. 다시 계산하거나 다른 박스를 선택하세요.");
      }
    }, 0);
  }

  function confirmChainPreview() {
    if (!latestResult || !chainPreview || chainPreview.addedQuantity <= 0) {
      return;
    }

    onConfirmChainSimulation(chainPreview, latestResult.resultId);
    setChainPreview(null);
    setChainStatus("idle");
    setChainStatusMessage("추가 결과를 반영했습니다.");
  }

  function clearChainSelection() {
    setSelectedChainTemplateId(null);
    setChainPreview(null);
    setSelectedBlockTemplateId(null);
    setChainStatus("idle");
    setChainStatusMessage("추가할 박스 1개를 선택하세요.");
  }

  return (
    <section className="panel result-stage" ref={ref} tabIndex={-1} data-has-result={Boolean(latestResult)}>
      <div className="result-stage-header">
        <div>
          <span className="badge" data-tone="green">
            메인 결과
          </span>
          <h2>{getWorkspaceSectionTitle("result")}</h2>
                  <p className="panel-subtitle">
                    계산 결과를 3D로 먼저 확인하고, 위/앞/옆 보기로 위치를 다시 점검합니다.
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
        <SummaryTile label="대상 공간" value={resultSpace?.name ?? "미선택"} />
      </div>

      {safetySpaceSplitWarning ? (
        <div className="review-status-banner" data-tone="amber" role="status">
          <span className="badge" data-tone="amber">
            현장 안내
          </span>
          <p className="fine-print">{safetySpaceSplitWarning}</p>
        </div>
      ) : null}

      {latestResult ? (
        <div className="result-preview result-preview-large" tabIndex={0} aria-label="3D 및 2D 배치 검토 작업대">
          <div className="result-workspace-grid">
            <aside className="result-space-panel" aria-label="공간 인스턴스 선택">
              <div className="result-panel-head">
                <strong>공간</strong>
                        <span className="fine-print">{displayedSpaces.length}개 공간</span>
              </div>
              <div className="space-instance-list">
                {displayedSpaces.map((space, index) => (
                  <button
                    key={space.spaceInstanceId}
                    className="space-instance-button"
                    aria-pressed={space.spaceInstanceId === selectedPackedSpace?.spaceInstanceId}
                    onClick={() => {
                      setSelectedSpaceInstanceId(space.spaceInstanceId);
                      setSelectedBlockTemplateId(null);
                    }}
                  >
                    <strong>Space {index + 1}</strong>
                    <span>
                      {space.blocks.length}개 · {Math.round(space.utilizationRate * 100)}%
                    </span>
                    <small className="space-load-summary">
                      {displayedSpaceSummaries.get(space.spaceInstanceId) ?? "적재 박스 없음"}
                    </small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="projection-stage" aria-label="배치 뷰어">
              <div className="projection-toolbar">
                <div>
                          <strong>{resultViewMode === "three" ? "3D 보기" : `${getProjectionViewLabel(projectionView)} 보기`}</strong>
                  <span className="fine-print">
                    {resultSpace?.name ?? "공간 미선택"} · {usableSize ? formatDimensions(usableSize) : "-"}
                  </span>
                </div>
                <div className="view-buttons" aria-label="결과 보기 방식 선택">
                  <button
                    className="secondary-button"
                    aria-pressed={resultViewMode === "three"}
                    onClick={() => setResultViewMode("three")}
                  >
                    3D
                  </button>
                  {PROJECTION_VIEWS.map((view) => (
                    <button
                      key={view}
                      className="secondary-button"
                      aria-pressed={resultViewMode === view}
                      onClick={() => selectProjectionView(view)}
                    >
                              {view === "top" ? "위" : view === "front" ? "앞" : "옆"}
                    </button>
                  ))}
                  <button className="secondary-button" onClick={resetResultViewer}>
                            <RotateCcw size={16} />
                            처음
                  </button>
                </div>
              </div>

              {resultViewMode === "three" && selectedPackedSpace && usableSize ? (
                <>
                  <div className="view-buttons three-camera-buttons" aria-label="3D 카메라 시점 선택">
                    {THREE_CAMERA_PRESETS.map((item) => (
                      <button
                        key={item.preset}
                        className="secondary-button"
                        aria-pressed={threeCameraPreset === item.preset}
                        onClick={() => setThreeCameraPreset(item.preset)}
                      >
                                {item.preset === "isometric" ? "사시" : item.preset === "top" ? "위" : item.preset === "front" ? "앞" : "옆"}
                      </button>
                    ))}
                  </div>
                  <Result3DCanvas
                    blocks={selectedPackedSpace.blocks}
                    bounds={usableSize}
                    selectedBlockTemplateId={selectedBlockTemplateId}
                    chainPreviewBlockIds={chainPreviewBlockIds}
                    cameraPreset={threeCameraPreset}
                    resetToken={threeResetToken}
                    spaceLabel={`Space ${selectedPackedSpaceIndex + 1}`}
                    utilizationLabel={`적재율 ${Math.round(selectedPackedSpace.utilizationRate * 100)}%`}
                    onSelectBlockTemplate={toggleSelectedBlockTemplate}
                    onClearSelection={clearSelectedBlockTemplate}
                  />
                </>
              ) : (
                <>
                  <div className="projection-board" data-view={projectionView}>
                    {projectedBlocks.length > 0 ? (
                      projectedBlocks.map((block) => {
                        const isSelected =
                          selectedBlockTemplateId === null || selectedBlockTemplateId === block.blockTemplateId;
                        const previewState = chainPreview
                          ? chainPreviewBlockIds.has(block.blockId)
                            ? "new"
                            : "base"
                          : undefined;
                        const blockStyle = {
                          "--block-color": block.color,
                          left: `${block.leftPercent}%`,
                          top: `${block.topPercent}%`,
                          width: `${Math.max(block.widthPercent, 1.4)}%`,
                          height: `${Math.max(block.heightPercent, 1.4)}%`,
                          zIndex: Math.max(1, Math.round(block.depthOrder))
                        } as React.CSSProperties;

                        return (
                          <span
                            key={block.blockId}
                            className="projected-block"
                            data-muted={!isSelected}
                            data-fragile={block.fragile}
                            data-chain-preview={previewState}
                            role="button"
                            tabIndex={0}
                            aria-label={`${block.name} ${getProjectionViewLabel(projectionView)} 투영`}
                            title={`${block.name} · ${block.fragile ? "깨짐주의" : "일반"}`}
                            style={blockStyle}
                            onClick={() => toggleSelectedBlockTemplate(block.blockTemplateId)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleSelectedBlockTemplate(block.blockTemplateId);
                              }
                            }}
                          >
                            <span>{block.name}</span>
                          </span>
                        );
                      })
                    ) : (
                      <div className="projection-empty">
                        <strong>표시할 배치 좌표가 없습니다.</strong>
                                <span className="fine-print">결과를 다시 만들면 배치 위치를 확인할 수 있습니다.</span>
                      </div>
                    )}
                  </div>

                  <div className="projection-status">
                    <span className="badge" data-tone="green">
                      {selectedBlockTemplateId ? "강조" : "표시"} {visibleBlockCount}개
                    </span>
                    <span className="fine-print">
                      {selectedLegendItem ? `${selectedLegendItem.name} 유형만 강조 중` : "전체 박스 표시"}
                    </span>
                  </div>
                </>
              )}
            </section>

            <aside className="result-legend-panel" aria-label="박스 유형 범례">
              <div className="result-panel-head">
                <strong>박스 범례</strong>
                <span className="fine-print">{legendItems.length}개 유형</span>
              </div>
              <div className="projection-legend-list">
                {legendItems.map((item) => (
                  <button
                    key={item.blockTemplateId}
                    className="projection-legend-item"
                    aria-pressed={item.blockTemplateId === selectedBlockTemplateId}
                    onClick={() => toggleSelectedBlockTemplate(item.blockTemplateId)}
                  >
                    <span className="legend-swatch" style={{ "--block-color": item.color } as React.CSSProperties} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                              {item.quantity}개 · {item.fragile ? "깨짐주의" : "일반"}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      ) : (
                <div className="result-preview result-preview-empty" tabIndex={0} aria-label="결과 대기 상태">
                  <strong>결과 대기 중</strong>
                  <span className="fine-print">
                    {review && !review.cta.disabled
                      ? "입력이 준비되었습니다. 결과를 만들면 3D 적재 보기를 확인할 수 있습니다."
                      : (review?.cta.disabledReason ?? "공간과 박스를 확인한 뒤 3번 영역에서 결과를 만드세요.")}
                  </span>
                  {review && !review.cta.disabled ? (
                    <button className="primary-button result-empty-action" onClick={onCreateResult}>
                      <Box size={16} />
                      결과 만들기
                    </button>
                  ) : null}
                </div>
      )}

      <ChainSimulationPanel
        latestResult={latestResult}
        blockOptions={chainBlockOptions}
        selectedTemplateId={selectedChainTemplateId}
        chainStatus={chainStatus}
        statusMessage={chainStatusMessage}
        preview={chainPreview}
        chainHistory={latestResultChainHistory}
        latestChainItem={latestChainItem}
        onSelectTemplate={selectChainTemplate}
        onCalculate={calculateChainPreview}
        onConfirm={confirmChainPreview}
        onCreateResult={onCreateResult}
        onClearSelection={clearChainSelection}
        onUndo={() => {
          if (latestResult) {
            onUndoLastChainAddition(latestResult.resultId);
            setChainPreview(null);
            setSelectedBlockTemplateId(null);
            setChainStatus("idle");
            setChainStatusMessage("직전 추가를 취소했습니다.");
          }
        }}
      />

      <div className="result-lower-grid">
        <section className="sub-panel">
          <h3>입력 요약</h3>
          <p className="meta">
            현재 작업 박스 {review?.totals.totalBlockCount ?? 0}개 · 총 부피{" "}
            {formatM3(review?.totals.totalBlockVolumeM3 ?? 0)}
          </p>
        </section>
        <section className="sub-panel">
                  <h3>공간별 적재 결과</h3>
          {latestResult?.spaces?.length ? (
            <div className="compact-list">
              {latestResult.spaces.map((space, index) => (
                <div key={space.spaceInstanceId} className="compact-row">
                  <span>
                    <strong>Space {index + 1}</strong>
                    <small>
                      배치 {space.blocks.length}개 · 적재율 {Math.round(space.utilizationRate * 100)}%
                    </small>
                    <small className="space-load-summary">
                      {latestResultSpaceSummaries.get(space.spaceInstanceId) ?? "적재 박스 없음"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
                    <p className="meta">결과를 만들면 공간별 박스 배치가 저장됩니다.</p>
          )}
          {resultWarnings.length ? (
            <ul className="checklist compact-checklist">
              {resultWarnings.map((warning) => (
                <li key={warning} className="review-message" data-tone="amber">
                  <AlertTriangle size={18} color="var(--amber)" />
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {pendingImport ? (
        <ImportConflictPanel pendingImport={pendingImport} onResolve={onResolveImport} onExportJson={onExportJson} />
      ) : null}
    </section>
  );
};

function ChainSimulationPanel({
  latestResult,
  blockOptions,
  selectedTemplateId,
  chainStatus,
  statusMessage,
  preview,
  chainHistory,
  latestChainItem,
  onSelectTemplate,
  onCalculate,
  onConfirm,
  onCreateResult,
  onClearSelection,
  onUndo
}: {
  latestResult: TetrisWorkspace["recentResults"][number] | null;
  blockOptions: BlockTemplate[];
  selectedTemplateId: string | null;
  chainStatus: "idle" | "calculating" | "preview" | "empty" | "error";
  statusMessage: string;
  preview: ChainSimulationOutput | null;
  chainHistory: ChainHistoryItem[];
  latestChainItem: ChainHistoryItem | null;
  onSelectTemplate: (blockTemplateId: string) => void;
  onCalculate: () => void;
  onConfirm: () => void;
  onCreateResult: () => void;
  onClearSelection: () => void;
  onUndo: () => void;
}) {
  const hasResult = Boolean(latestResult);
  const canCalculate = hasResult && Boolean(selectedTemplateId) && chainStatus !== "calculating" && chainStatus !== "error";
  const canConfirm = hasResult && chainStatus === "preview" && Boolean(preview?.addedQuantity);

  return (
    <section className="sub-panel chain-simulation-panel" aria-labelledby="chain-simulation-title">
      <div className="chain-panel-header">
        <div>
          <span className="badge" data-tone={hasResult ? "green" : undefined}>
            기준 결과 잠금
          </span>
          <h3 id="chain-simulation-title">추가 박스 시뮬레이션</h3>
          <p className="panel-subtitle">
            현재 결과를 잠근 상태에서 남은 공간에 같은 유형 박스를 얼마나 더 넣을 수 있는지 확인합니다.
          </p>
        </div>
        <div className="chain-history-row" aria-label="체이닝 이력">
          <span className="badge">기준 결과</span>
          {chainHistory
            .slice()
            .reverse()
            .map((item) => (
              <span key={item.chainId} className="badge" data-tone="green">
                + {item.blockName ?? item.blockId} {item.addedQuantity}개
              </span>
            ))}
        </div>
      </div>

      {!hasResult ? (
        <p className="meta">결과를 먼저 생성하면 추가 적재를 시험할 수 있습니다.</p>
      ) : (
        <div className="chain-panel-grid">
          <div>
            <strong className="chain-field-title">추가할 박스</strong>
            <div className="chain-option-list" role="radiogroup" aria-label="추가할 박스 유형">
              {blockOptions.length === 0 ? (
                <p className="fine-print">현재 작업에 추가된 박스 유형이 없습니다.</p>
              ) : (
                blockOptions.map((template) => (
                  <button
                    key={template.blockTemplateId}
                    className="chain-option-button"
                    role="radio"
                    aria-checked={selectedTemplateId === template.blockTemplateId}
                    onClick={() => onSelectTemplate(template.blockTemplateId)}
                  >
                    <strong>{template.name}</strong>
                    <span>
                            {formatDimensions(template.dimensions)} · {template.fragile ? "깨짐주의" : "일반"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="chain-result-panel">
            <div className="chain-status-box" data-tone={chainStatus} role="status">
              <strong>
                {chainStatus === "preview"
                  ? "추가 가능"
                  : chainStatus === "empty"
                    ? "추가 가능 0"
                    : chainStatus === "error"
                      ? "기준 결과 확인 필요"
                      : chainStatus === "calculating"
                        ? "계산 중"
                        : "대기"}
              </strong>
              <span>{statusMessage}</span>
            </div>

            <div className="form-actions chain-actions">
              <button className="primary-button" onClick={onCalculate} disabled={!canCalculate}>
                {chainStatus === "calculating" ? "추가 가능 수량 계산 중..." : "최대 적재 계산"}
              </button>
              <button className="primary-button" onClick={onConfirm} disabled={!canConfirm}>
                이 결과 반영
              </button>
              {chainStatus === "error" ? (
                <button className="secondary-button" onClick={onCreateResult}>
                  결과 다시 생성
                </button>
              ) : null}
              <button className="secondary-button" onClick={onUndo} disabled={!latestChainItem}>
                직전 추가 취소
              </button>
              {chainStatus === "empty" ? (
                <button className="secondary-button" onClick={onClearSelection}>
                  다른 박스 선택
                </button>
              ) : null}
            </div>
            {!selectedTemplateId ? (
              <p className="fine-print review-cta-hint">박스를 선택해야 계산할 수 있습니다.</p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

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
  saveConflict,
  otherTabCount,
  compact = false,
  expanded,
  controls,
  onClick
}: {
  status: SaveStatus;
  needsExport: boolean;
  error: string | null;
  saveConflict: WorkspaceSaveConflictNotice | null;
  otherTabCount: number;
  compact?: boolean;
  expanded: boolean;
  controls: string;
  onClick: () => void;
}) {
  if (status === "conflict" || saveConflict) {
    return (
      <button
        className="status-pill status-pill-button"
        data-tone="red"
        aria-expanded={expanded}
        aria-controls={controls}
        aria-live="polite"
        onClick={onClick}
      >
                <AlertTriangle size={16} />
                {compact ? "최신본 필요" : "다른 탭 저장됨 · 최신본 필요"}
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        className="status-pill status-pill-button"
        data-tone="red"
        aria-expanded={expanded}
        aria-controls={controls}
        aria-live="polite"
        onClick={onClick}
        title={error ?? undefined}
      >
                <AlertTriangle size={16} />
                {compact ? "저장 실패" : "저장 실패 · 백업 만들기"}
      </button>
    );
  }

  if (status === "saving" || status === "loading") {
    return (
      <button
        className="status-pill status-pill-button"
        data-tone="amber"
        aria-expanded={expanded}
        aria-controls={controls}
        aria-live="polite"
        onClick={onClick}
      >
        <Save size={16} />
        {status === "loading" ? "작업본 불러오는 중" : "이 기기에 저장 중"}
      </button>
    );
  }

  return (
    <button
      className="status-pill status-pill-button"
      data-tone={needsExport ? "amber" : "green"}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-live="polite"
      onClick={onClick}
    >
      <CheckCircle2 size={16} />
      {compact
        ? otherTabCount > 0
          ? "편집 중"
                  : needsExport
                    ? "백업 필요"
                    : "저장됨"
        : otherTabCount > 0
          ? "이 기기에 저장됨 · 다른 탭 열림"
          : needsExport
                    ? "이 기기에 저장됨 · 백업 필요"
                    : "이 기기에 저장됨"}
    </button>
  );
}

function StorageReliabilityPanel({
  id,
  workspace,
  status,
  needsExport,
  error,
  lastLocalSavedAt,
  storageHealth,
  saveConflict,
  otherTabCount,
  persistenceRequestResult,
  persistenceRequesting,
  onClose,
  onExportJson,
  onReloadLatestWorkspace,
  onRequestStorageProtection
}: {
  id: string;
  workspace: TetrisWorkspace;
  status: SaveStatus;
  needsExport: boolean;
  error: string | null;
  lastLocalSavedAt: string | null;
  storageHealth: StorageHealthSnapshot | null;
  saveConflict: WorkspaceSaveConflictNotice | null;
  otherTabCount: number;
  persistenceRequestResult: PersistenceRequestResult | null;
  persistenceRequesting: boolean;
  onClose: () => void;
  onExportJson: () => void;
  onReloadLatestWorkspace: () => void;
  onRequestStorageProtection: () => void;
}) {
  const localState = getLocalSaveState(status, error, lastLocalSavedAt, saveConflict, otherTabCount);
  const exportState = getExportState(workspace, needsExport);
  const browserState = getBrowserProtectionState(storageHealth, persistenceRequestResult);
  const canRequestProtection =
    Boolean(storageHealth?.persistSupported) && storageHealth?.persistenceState !== "persisted" && !persistenceRequesting;

  return (
    <section
      id={id}
      className="storage-reliability-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
    >
      <div className="storage-panel-head">
        <div>
                  <h2 id={`${id}-title`}>작업 저장 상태</h2>
                  <p className="fine-print">이 기기 자동저장과 백업 파일은 서로 다른 안전장치입니다.</p>
        </div>
        <button className="icon-button panel-close-button" onClick={onClose} aria-label="저장 보호 패널 닫기">
          <X size={16} />
        </button>
      </div>

      <div className="storage-health-list">
        <StorageHealthRow
          icon={<Save size={18} />}
          tone={localState.tone}
          label="이 기기 저장"
          value={localState.value}
          description={localState.description}
        />
        <StorageHealthRow
          icon={<Download size={18} />}
          tone={exportState.tone}
                  label="백업 파일"
          value={exportState.value}
          description={exportState.description}
        />
        <StorageHealthRow
          icon={<HardDrive size={18} />}
          tone={browserState.tone}
          label="브라우저 보호"
          value={browserState.value}
          description={browserState.description}
          detail={browserState.detail}
        />
      </div>

      <div className="storage-health-actions">
        {saveConflict ? (
          <button className="primary-button" onClick={onReloadLatestWorkspace}>
            <RotateCcw size={16} />
            최신 작업본 불러오기
          </button>
        ) : null}
        <button className={saveConflict ? "secondary-button" : "primary-button"} onClick={onExportJson}>
          <Download size={16} />
                  {saveConflict ? "현재 작업 백업 만들기" : status === "error" ? "지금 백업" : "백업 파일 만들기"}
        </button>
        <button
          className="secondary-button"
          onClick={onRequestStorageProtection}
          disabled={!canRequestProtection}
          title={!storageHealth?.persistSupported ? "이 브라우저에서는 저장 보호 요청을 지원하지 않습니다." : undefined}
        >
          <ShieldCheck size={16} />
                  {persistenceRequesting ? "보호 요청 중" : "작업 보호 강화"}
        </button>
      </div>
    </section>
  );
}

function StorageHealthRow({
  icon,
  tone,
  label,
  value,
  description,
  detail
}: {
  icon: React.ReactNode;
  tone: "green" | "amber" | "red" | "neutral";
  label: string;
  value: string;
  description: string;
  detail?: string | null;
}) {
  return (
    <div className="storage-health-row" data-tone={tone}>
      <span className="storage-health-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <div className="storage-health-row-head">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <p className="fine-print">{description}</p>
        {detail ? <p className="fine-print storage-health-detail">{detail}</p> : null}
      </div>
    </div>
  );
}

function getLocalSaveState(
  status: SaveStatus,
  error: string | null,
  lastLocalSavedAt: string | null,
  saveConflict: WorkspaceSaveConflictNotice | null,
  otherTabCount: number
) {
  if (status === "conflict" || saveConflict) {
    return {
      tone: "red" as const,
      value: "다른 탭 최신본 감지",
              description: "이 화면은 보호를 위해 잠겼습니다. 최신본을 불러오면 계속할 수 있습니다.",
      detail: saveConflict
        ? `저장소 revision ${saveConflict.storedRevision} · 이 탭 기준 ${saveConflict.expectedRevision}`
                : "최신 작업본을 불러오거나 현재 화면을 백업 파일로 남기세요."
    };
  }

  if (status === "error") {
    return {
      tone: "red" as const,
      value: "저장 실패",
      description: error
        ? `브라우저 저장소에 쓰지 못했습니다. ${error}`
        : "브라우저 저장소에 쓰지 못했습니다. 이 기기 저장이 불안정할 수 있습니다.",
      detail: null
    };
  }

  if (status === "loading") {
    return {
      tone: "amber" as const,
      value: "불러오는 중",
      description: "이 기기에 저장된 작업본을 확인하고 있습니다.",
      detail: null
    };
  }

  if (status === "saving") {
    return {
      tone: "amber" as const,
      value: "저장 중",
              description: "현재 작업을 이 기기에 자동저장하고 있습니다.",
      detail: otherTabCount > 0 ? "다른 탭도 열려 있습니다. 저장 기준 revision을 확인합니다." : null
    };
  }

  return {
    tone: otherTabCount > 0 ? ("amber" as const) : ("green" as const),
    value: otherTabCount > 0 ? "이 탭이 편집 중 · 다른 탭 열림" : "자동저장됨",
    description: lastLocalSavedAt
      ? `마지막 이 기기 저장: ${formatDateTime(lastLocalSavedAt)}`
      : "브라우저를 닫아도 이 기기에서는 이어서 작업할 수 있습니다.",
    detail:
      otherTabCount > 0
        ? "다른 탭을 참고용으로 열어둘 수 있지만, 같은 작업본 편집은 한 탭에서만 이어가는 것이 안전합니다."
        : null
  };
}

function getExportState(workspace: TetrisWorkspace, needsExport: boolean) {
  if (needsExport) {
    return {
      tone: "amber" as const,
      value: "업데이트 필요",
              description: workspace.lastExportedAt
                ? `마지막 백업 이후 변경됨. 마지막 백업: ${formatDateTime(workspace.lastExportedAt)}`
                : "아직 다른 기기로 옮길 백업 파일이 없습니다. 파일 형식은 JSON입니다."
    };
  }

  if (!workspace.lastExportedAt) {
    return {
      tone: "neutral" as const,
      value: "대기",
              description: "작업 데이터가 생기면 백업 파일 필요 여부를 표시합니다."
    };
  }

  return {
    tone: "green" as const,
    value: "최신",
    description: `마지막 백업: ${formatDateTime(workspace.lastExportedAt)}`
  };
}

function getBrowserProtectionState(
  storageHealth: StorageHealthSnapshot | null,
  persistenceRequestResult: PersistenceRequestResult | null
) {
  if (!storageHealth) {
    return {
      tone: "neutral" as const,
      value: "확인 중",
      description: "이 브라우저에서 작업 보호를 강화할 수 있는지 확인합니다.",
      detail: null
    };
  }

  const detail = getStorageUsageDetail(storageHealth);

  if (storageHealth.persistenceState === "persisted") {
    return {
      tone: "green" as const,
      value: "보호됨",
      description: "브라우저 저장 공간 정리로 삭제될 가능성을 낮췄습니다.",
      detail
    };
  }

  if (storageHealth.persistenceState === "denied" || persistenceRequestResult === "denied") {
    return {
      tone: "amber" as const,
      value: "보호되지 않음",
              description: "요청이 허용되지 않았습니다. 백업 파일을 함께 보관하세요.",
      detail
    };
  }

  if (storageHealth.persistenceState === "error" || persistenceRequestResult === "error") {
    return {
      tone: "red" as const,
      value: "확인 실패",
      description: storageHealth.errorMessage ?? "브라우저 저장 보호 상태를 확인하지 못했습니다.",
      detail
    };
  }

  if (storageHealth.persistenceState === "unsupported") {
    return {
      tone: "neutral" as const,
      value: "지원되지 않음",
              description: "이 환경에서는 브라우저 보호 요청을 사용할 수 없습니다. 백업 파일을 보관하세요.",
      detail
    };
  }

  return {
    tone: "amber" as const,
    value: "보호 강화 가능",
              description: "브라우저 정책에 따라 이 기기 작업이 정리될 수 있습니다.",
    detail
  };
}

function getStorageUsageDetail(storageHealth: StorageHealthSnapshot) {
  if (storageHealth.usageLabel && storageHealth.quotaLabel) {
    const ratio = storageHealth.usageRatioLabel ? ` (${storageHealth.usageRatioLabel})` : "";
    return `브라우저 추정 사용량 ${storageHealth.usageLabel} / ${storageHealth.quotaLabel}${ratio}`;
  }

  if (storageHealth.usageLabel) {
    return `브라우저 추정 사용량 ${storageHealth.usageLabel}`;
  }

  if (!storageHealth.estimateSupported) {
    return "이 브라우저는 저장 용량 추정값을 제공하지 않습니다.";
  }

  return "브라우저가 제공한 대략치를 표시합니다.";
}

function SpaceFormDialog({
  open,
  mode,
  value,
  error,
  saveDisabled,
  saveDisabledReason,
  onChange,
  onClose,
  onSave
}: {
  open: boolean;
  mode: SpaceDialogMode;
  value: typeof DEFAULT_SPACE_FORM;
  error: string | null;
  saveDisabled: boolean;
  saveDisabledReason: string | null;
  onChange: (value: typeof DEFAULT_SPACE_FORM) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = getSpaceDialogCopy(mode);
  const titleId = "space-form-dialog-title";

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }

      window.setTimeout(() => {
        dialog.querySelector<HTMLInputElement>("input")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="space-form-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="space-form-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id={titleId}>{copy.title}</h2>
            <p className="fine-print">{copy.helperLabel}</p>
          </div>
          <button className="icon-button panel-close-button" onClick={onClose} aria-label="공간 입력 닫기">
            <X size={16} />
          </button>
        </div>
        <div className="space-form-dialog-body">
          <SpaceForm value={value} onChange={onChange} />
          {error || saveDisabledReason ? (
            <p className="form-error" role="alert">
              {error ?? saveDisabledReason}
            </p>
          ) : null}
        </div>
        <div className="form-actions space-form-dialog-actions">
          <button className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button className="primary-button" onClick={onSave} disabled={saveDisabled}>
            <Plus size={16} />
            {copy.primaryLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function DeleteConfirmDialog({
  pendingDelete,
  confirmDisabled,
  confirmDisabledReason,
  onClose,
  onConfirm
}: {
  pendingDelete: PendingDelete | null;
  confirmDisabled: boolean;
  confirmDisabledReason: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "delete-confirm-dialog-title";
  const descriptionId = "delete-confirm-dialog-description";
  const copy = pendingDelete ? getDeleteConfirmationCopy(pendingDelete.kind, pendingDelete.name) : null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (pendingDelete) {
      if (!dialog.open) {
        dialog.showModal();
      }

      window.setTimeout(() => {
        dialog.querySelector<HTMLButtonElement>("[data-cancel-button='true']")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [pendingDelete]);

  return (
    <dialog
      ref={dialogRef}
      className="delete-confirm-dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="delete-confirm-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id={titleId}>{copy?.title ?? "삭제 확인"}</h2>
            <p id={descriptionId} className="fine-print">
              {copy?.description ?? "삭제 전에 한 번 더 확인해 주세요."}
            </p>
            {confirmDisabledReason ? (
              <p className="form-error" role="alert">
                {confirmDisabledReason}
              </p>
            ) : null}
          </div>
          <button className="icon-button panel-close-button" onClick={onClose} aria-label="삭제 확인 닫기">
            <X size={16} />
          </button>
        </div>
        <div className="form-actions delete-confirm-actions">
          <button
            data-cancel-button="true"
            className="secondary-button"
            autoFocus
            onClick={onClose}
          >
            취소
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={confirmDisabled}>
            <Trash2 size={16} />
            {copy?.confirmLabel ?? "삭제"}
          </button>
        </div>
      </div>
    </dialog>
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
        안전 여유 가로(mm)
        <input
          inputMode="numeric"
          type="number"
          min="0"
          value={value.offsetWidthMm}
          onChange={(event) => onChange({ ...value, offsetWidthMm: Number(event.target.value) })}
        />
      </label>
      <label>
        안전 여유 세로(mm)
        <input
          inputMode="numeric"
          type="number"
          min="0"
          value={value.offsetDepthMm}
          onChange={(event) => onChange({ ...value, offsetDepthMm: Number(event.target.value) })}
        />
      </label>
      <label>
        안전 여유 높이(mm)
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
  onResolve,
  onExportJson
}: {
  pendingImport: PendingImport;
  onResolve: (option: ImportConflictOption) => void;
  onExportJson: () => void;
}) {
  return (
    <div className="import-panel" role="alert">
      <strong>백업 파일 가져오기 확인</strong>
      <p className="fine-print">
        충돌 유형: {pendingImport.conflict.kind}. 현재 작업을 보존하거나, 가져온 파일로 대체하거나, 복사본으로 열 수
        있습니다.
      </p>
      <p className="fine-print">현재 작업을 아직 내보내지 않았다면 먼저 백업한 뒤 대체를 선택하세요.</p>
      <div className="form-actions">
        <button className="secondary-button" onClick={onExportJson}>
          <Download size={16} />
          현재 작업 먼저 백업
        </button>
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

function createChainBlockOptions(blocks: BlockDefinition[]): BlockTemplate[] {
  const templateMap = new Map<string, BlockTemplate>();

  blocks.forEach((block) => {
    if (templateMap.has(block.blockTemplateId)) {
      return;
    }

    templateMap.set(block.blockTemplateId, {
      blockTemplateId: block.blockTemplateId,
      entityVersion: block.entityVersion,
      name: block.name,
      dimensions: block.dimensions,
      fragile: block.fragile,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt
    });
  });

  return Array.from(templateMap.values());
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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

function isWorkspaceSyncMessage(value: unknown): value is WorkspaceSyncMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WorkspaceSyncMessage>;

  if (
    candidate.type !== "tab-opened" &&
    candidate.type !== "tab-present" &&
    candidate.type !== "tab-closed" &&
    candidate.type !== "workspace-saved"
  ) {
    return false;
  }

  if (typeof candidate.tabId !== "string" || typeof candidate.sentAt !== "string") {
    return false;
  }

  if (candidate.type !== "workspace-saved") {
    return true;
  }

  const savedCandidate = candidate as Partial<Extract<WorkspaceSyncMessage, { type: "workspace-saved" }>>;
  return (
    typeof savedCandidate.fileId === "string" &&
    typeof savedCandidate.revision === "number" &&
    typeof savedCandidate.updatedAt === "string"
  );
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}
