"use client";

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileUp,
  HardDrive,
  ListOrdered,
  Maximize2,
  PackagePlus,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  WifiOff,
  X
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  ChangeEvent,
  FocusEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import { IndexedDbTetrisStorage, WorkspaceSaveConflictError } from "@/lib/persistence/indexed-db";
import {
  copyWorkspaceForNewFile,
  detectImportConflict,
  exportWorkspaceToJson,
  parseWorkspaceImport
} from "@/lib/persistence/json-transfer";
import {
  readStorageHealth,
  hasMeaningfulWorkspaceData,
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
  createBlockGroup,
  createBlockTemplate,
  removeBlockGroup,
  removeBlockTemplate,
  removeDraftBlockItem,
  restoreDraftBlockItem,
  resolveDraftBlocks,
  searchBlockTemplates,
  updateBlockTemplate,
  updateDraftBlockItemQuantity
} from "@/lib/workspace/block-library";
import {
  calculateBlockVolumeM3,
  hasPositiveDimensions,
  isValidBlockMeasurementInput
} from "@/lib/workspace/block-measurements";
import {
  createOptimizationInput,
  reviewExecutionReadiness,
  ReviewGateResult
} from "@/lib/workspace/review-gate";
import { runChainSimulationV0, type ChainSimulationOutput } from "@/lib/workspace/chain-simulation";
import {
  resolveChainComparisonSpaces,
  type ChainComparisonMode
} from "@/lib/workspace/chain-comparison-view";
import { writeClipboardText } from "@/lib/workspace/clipboard-text";
import {
  getDeleteConfirmationCopy,
  type DeleteConfirmationKind
} from "@/lib/workspace/delete-confirmation-copy";
import { getSaveConflictBannerCopy } from "@/lib/workspace/save-conflict-banner-copy";
import { createLocalSaveState } from "@/lib/workspace/storage-save-state";
import { parseFieldIntegerInput } from "@/lib/workspace/field-number-input";
import { getSpaceDialogCopy, type SpaceDialogMode } from "@/lib/workspace/space-dialog-copy";
import { validateSpaceForm } from "@/lib/workspace/space-form-validation";
import { runPackingEngineInWorker } from "@/lib/workspace/packing-worker-client";
import {
  createProjectedBlocks,
  createProjectionLegendItems,
  getProjectionViewLabel,
  type ProjectionView
} from "@/lib/workspace/projection-view";
import {
  getResultViewTitle,
  isProjectionViewControlId,
  RESULT_VIEW_CONTROL_ITEMS,
  THREE_CAMERA_CONTROL_ITEMS,
  type ResultViewControlId,
  type ResultViewMode
} from "@/lib/workspace/result-viewer-controls";
import {
  calculateResultRemainingVolumeM3,
  formatVolumeM3
} from "@/lib/workspace/result-remaining-volume";
import {
  getResultCalculationProgressCopy,
  type ResultCalculationProgressCopy,
  type ResultCalculationProgressStep
} from "@/lib/workspace/result-calculation-progress";
import {
  createPackingResultWarnings,
  SPACE_SPLIT_FLOOR_SUPPORT_WARNING
} from "@/lib/workspace/result-warnings";
import { createResultWarningSummary } from "@/lib/workspace/result-warning-summary";
import { downloadTextFile } from "@/lib/workspace/text-file-download";
import {
  createStackingInstructionDownloadSuccessMessage,
  createStackingInstructionFilename
} from "@/lib/workspace/loading-instruction-file";
import {
  createResultFreshnessState,
  createResultInputFingerprint,
  type ResultFreshnessState
} from "@/lib/workspace/result-freshness";
import {
  createResultCalculationFailure,
  type ResultCalculationFailure
} from "@/lib/workspace/result-calculation-failure";
import {
  createOffsetAdjustmentRecommendation,
  createOverhangPalletRecommendation,
  type ResultSpaceAdjustmentRecommendation
} from "@/lib/workspace/result-offset-recommendation";
import { getWorkspaceSectionTitle, WORKSPACE_SECTION_ORDER } from "@/lib/workspace/layout-sections";
import {
  createMobileStickyActionState,
  getMobileStickyActionAriaLabel
} from "@/lib/workspace/mobile-sticky-action";
import {
  createFieldHandoffChecklist,
  type FieldHandoffChecklistAction
} from "@/lib/workspace/field-handoff-checklist";
import { createWorkspaceBackupFilename } from "@/lib/workspace/workspace-backup-file";
import {
  createConnectivityStatus,
  type ConnectivityStatus,
  type NetworkState
} from "@/lib/workspace/connectivity-status";
import {
  getPwaOfflineReadinessCopy,
  type PwaOfflineReadinessStatus
} from "@/lib/workspace/pwa-offline-readiness";
import {
  getPwaInstallActionLabel,
  getPwaInstallGuidanceCopy,
  type PwaInstallStatus
} from "@/lib/workspace/pwa-install-guidance";
import { getImportConflictCopy } from "@/lib/workspace/import-conflict-copy";
import { hasCurrentWorkToReset, resetCurrentWorkspace } from "@/lib/workspace/current-work-reset";
import { loadFieldDemoCurrentWork } from "@/lib/workspace/field-demo-workspace";
import { calculateUsableSize, DEFAULT_PALLET_SPACE_ID, PRESET_SPACES } from "@/lib/workspace/presets";
import { createPlacementDetailRows } from "@/lib/workspace/placement-detail-table";
import { createPackedSpaceLoadSummary } from "@/lib/workspace/space-load-summary";
import {
  createStackingInstructionText,
  createStackingInstructionSpaceLabel,
  createStackingInstructionSteps,
  createStackingLayerSummaries,
  formatStackingInstructionCalculatedAt
} from "@/lib/workspace/stacking-layer-summary";
import { createDefaultWorkspace } from "@/lib/workspace/workspace-factory";
import { normalizeWorkspace as normalizeWorkspaceForV2 } from "@/lib/workspace/workspace-migration";
import {
  BlockGroup,
  BlockDefinition,
  BlockTemplate,
  ChainHistoryItem,
  DraftBlockItem,
  ImportConflict,
  ImportConflictOption,
  PackedBlock,
  SpaceDefinition,
  TetrisWorkspace
} from "@/lib/workspace/types";
import { PwaServiceWorkerRegistrar } from "./pwa-service-worker-registrar";
import type { ThreeCameraPreset } from "./result-stage/result-3d-canvas.client";

type SaveStatus = "loading" | "saving" | "saved" | "error" | "conflict";
type InstructionCopyStatus = "idle" | "copied" | "error";
type InstructionDownloadStatus = "idle" | "downloaded" | "error";
type ResultInspectionDialogKind = "placement" | "stacking";

interface PwaBeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

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
  name: "",
  widthMm: 300,
  depthMm: 220,
  heightMm: 180,
  weightKg: "",
  group1: "",
  group2: "",
  fragile: false
};

type BlockForm = typeof DEFAULT_BLOCK_FORM;
const STORAGE_PANEL_ID = "storage-reliability-panel";
const MOBILE_STICKY_STATUS_ID = "mobile-sticky-status";
const MOBILE_STICKY_HELPER_ID = "mobile-sticky-helper";
const RESULT_PROGRESS_REVIEW_DELAY_MS = 80;
const RESULT_PROGRESS_FRAME_DELAY_MS = 16;
const RESULT_PROGRESS_RENDER_DELAY_MS = 80;
const BLOCK_LIBRARY_PAGE_SIZE = 12;

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
  const spaceWorkflowSectionRef = useRef<HTMLElement>(null);
  const currentWorkSectionRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<TetrisWorkspace | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const deferredInstallPromptRef = useRef<PwaBeforeInstallPromptEvent | null>(null);
  const lastPersistedRevisionRef = useRef<number | null>(null);
  const saveConflictRef = useRef<WorkspaceSaveConflictNotice | null>(null);
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
  const [networkState, setNetworkState] = useState<NetworkState>("unknown");
  const [pwaOfflineStatus, setPwaOfflineStatus] = useState<PwaOfflineReadinessStatus>("checking");
  const [pwaInstallStatus, setPwaInstallStatus] = useState<PwaInstallStatus>("checking");
  const [persistenceRequestResult, setPersistenceRequestResult] = useState<PersistenceRequestResult | null>(null);
  const [persistenceRequesting, setPersistenceRequesting] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingDraftUndo, setPendingDraftUndo] = useState<PendingDraftUndo | null>(null);
  const [resetWorkDialogOpen, setResetWorkDialogOpen] = useState(false);
  const [spaceForm, setSpaceForm] = useState(DEFAULT_SPACE_FORM);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [spaceFormError, setSpaceFormError] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState(DEFAULT_BLOCK_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [creatingResult, setCreatingResult] = useState(false);
  const [resultCalculationStep, setResultCalculationStep] = useState<ResultCalculationProgressStep>("idle");
  const [resultFailure, setResultFailure] = useState<ResultCalculationFailure | null>(null);

  const setWorkspaceSaveConflict = useCallback((nextConflict: WorkspaceSaveConflictNotice | null) => {
    saveConflictRef.current = nextConflict;
    setSaveConflict(nextConflict);
  }, []);

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
        setWorkspaceSaveConflict({
          storedRevision: message.revision,
          incomingRevision: workspaceRef.current?.revision ?? message.revision,
          expectedRevision: lastPersistedRevisionRef.current ?? 0,
          storedUpdatedAt: message.updatedAt,
          source: "remote"
        });
        setStoragePanelOpen(true);
      }
    },
    [publishWorkspaceSyncMessage, setWorkspaceSaveConflict, tabSessionId]
  );

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    lastPersistedRevisionRef.current = lastPersistedRevision;
  }, [lastPersistedRevision]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const updateNetworkState = () => {
      setNetworkState(navigator.onLine ? "online" : "offline");
    };

    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);

    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as NavigatorWithStandalone).standalone === true;

    if (isStandalone) {
      setPwaInstallStatus("installed");
    } else {
      setPwaInstallStatus("manual");
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPromptRef.current = event as PwaBeforeInstallPromptEvent;
      setPwaInstallStatus("available");
    };

    const handleAppInstalled = () => {
      deferredInstallPromptRef.current = null;
      setPwaInstallStatus("installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

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
          setWorkspaceSaveConflict(null);
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
  }, [refreshStorageHealth, setWorkspaceSaveConflict, storage]);

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
          setWorkspaceSaveConflict({
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
  }, [publishWorkspaceSyncMessage, refreshStorageHealth, saveConflict, setWorkspaceSaveConflict, storage, tabSessionId, workspace]);

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
  const draftBlocks = useMemo(() => (workspace ? resolveDraftBlocks(workspace) : []), [workspace]);
  const review = workspace
    ? reviewExecutionReadiness({
        selectedSpace,
        blocks: draftBlocks,
        fragileStackOnFragileAllowed: workspace.policy.fragileStackOnFragileAllowed
      })
    : null;
  const latestResult = workspace?.recentResults[0] ?? null;
  const currentResultInputFingerprint = workspace
    ? createResultInputFingerprint({
        selectedSpace,
        blocks: draftBlocks,
        fragileStackOnFragileAllowed: workspace.policy.fragileStackOnFragileAllowed
      })
    : null;
  const resultFreshnessState = createResultFreshnessState({
    currentFingerprint: currentResultInputFingerprint,
    resultFingerprint: latestResult?.inputFingerprint,
    canCreateResult: Boolean(review && !review.cta.disabled),
    disabledReason: review?.cta.disabledReason ?? null
  });
  const resultCalculationProgress = getResultCalculationProgressCopy(resultCalculationStep);
  const needsExport = Boolean(workspace && shouldRemindExport(workspace));
  const connectivityStatus = useMemo(
    () =>
      createConnectivityStatus({
        networkState,
        hasMeaningfulWorkspaceData: Boolean(workspace && hasMeaningfulWorkspaceData(workspace))
      }),
    [networkState, workspace]
  );
  const otherTabCount = getActiveWorkspacePeerCount(workspaceSyncState, new Date().toISOString());
  const isWorkspaceLocked = Boolean(saveConflict);
  const spaceDialogMode: SpaceDialogMode = editingSpaceId ? "edit" : "add";
  const canResetCurrentWork = workspace ? hasCurrentWorkToReset(workspace) : false;
  const hasBlockingDialog = spaceDialogOpen || Boolean(pendingDelete) || resetWorkDialogOpen;
  const mobileStickyAction = useMemo(
    () =>
      createMobileStickyActionState({
        isWorkspaceLocked,
        hasResult: Boolean(latestResult),
        isResultStale: resultFreshnessState.status === "stale",
        canCreateResult: Boolean(review && !review.cta.disabled),
        reviewCtaLabel: "결과 만들기",
        reviewCtaReason: review?.cta.disabledReason ?? null,
        saveStatus,
        needsExport,
        isCreatingResult: creatingResult
      }),
    [creatingResult, isWorkspaceLocked, latestResult, needsExport, resultFreshnessState.status, review, saveStatus]
  );
  const saveConflictBannerCopy = saveConflict ? getSaveConflictBannerCopy(saveConflict) : null;

  const installPwaOrShowGuidance = useCallback(async () => {
    const installPrompt = deferredInstallPromptRef.current;

    if (!installPrompt) {
      setPwaInstallStatus((current) => (current === "installed" ? current : "manual"));
      setStoragePanelOpen(true);
      return;
    }

    try {
      setPwaInstallStatus("prompting");
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      deferredInstallPromptRef.current = null;
      setPwaInstallStatus(choice.outcome === "accepted" ? "accepted" : "dismissed");
    } catch {
      deferredInstallPromptRef.current = null;
      setPwaInstallStatus("manual");
      setStoragePanelOpen(true);
    }
  }, []);

  function updateWorkspace(updater: (current: TetrisWorkspace, now: string) => TetrisWorkspace) {
    setWorkspace((current) => {
      if (!current) {
        return current;
      }
      if (saveConflictRef.current) {
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
    } else if (pendingDelete.kind === "block-group") {
      deleteBlockGroup(pendingDelete.entityId);
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
          current.draft.selectedSpaceId === spaceId ? DEFAULT_PALLET_SPACE_ID : current.draft.selectedSpaceId,
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
          weightKg: parseOptionalWeightKg(blockForm.weightKg),
          group1: blockForm.group1,
          group2: blockForm.group2,
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
        weightKg: parseOptionalWeightKg(blockForm.weightKg),
        group1: blockForm.group1,
        group2: blockForm.group2,
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
      weightKg: formatOptionalWeightFormValue(template.weightKg),
      group1: template.group1 ?? "",
      group2: template.group2 ?? "",
      fragile: template.fragile
    });
  }

  function addBlockGroup(name: string, parentGroupId: string | null) {
    updateWorkspace((current, now) =>
      createBlockGroup(current, {
        name,
        parentGroupId,
        now
      })
    );
  }

  function deleteBlockGroup(blockGroupId: string) {
    updateWorkspace((current, now) =>
      removeBlockGroup(current, {
        blockGroupId,
        now
      })
    );
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

  function requestResetCurrentWork() {
    if (!canResetCurrentWork || saveConflict) {
      return;
    }

    setResetWorkDialogOpen(true);
  }

  function closeResetCurrentWorkDialog() {
    setResetWorkDialogOpen(false);
  }

  function confirmResetCurrentWork() {
    if (saveConflict) {
      return;
    }

    updateWorkspace((current, now) => resetCurrentWorkspace(current, now));
    setPendingDraftUndo(null);
    setResultFailure(null);
    setResultCalculationStep("idle");
    setCreatingResult(false);
    setResetWorkDialogOpen(false);
  }

  function loadFieldDemoCurrentWorkIntoDraft() {
    if (saveConflict) {
      return;
    }

    updateWorkspace((current, now) => loadFieldDemoCurrentWork(current, now));
    setPendingDraftUndo(null);
    setResultFailure(null);
    setResultCalculationStep("idle");
    setCreatingResult(false);
    window.setTimeout(() => {
      currentWorkSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      currentWorkSectionRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function createPackingResult() {
    if (!workspace || !review || creatingResult) {
      return;
    }

    const optimizationInput = createOptimizationInput(review, createClientId("run"));
    const focusResultStage = () => {
      window.setTimeout(() => {
        resultStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        resultStageRef.current?.focus({ preventScroll: true });
      }, 0);
    };
    const finishResultCreation = () => {
      setCreatingResult(false);
      setResultCalculationStep("idle");
    };

    if (!optimizationInput) {
      setResultFailure(createResultCalculationFailure(new Error("input constraint violation")));
      setResultCalculationStep("idle");
      focusResultStage();
      return;
    }

    setResultFailure(null);
    setResultCalculationStep("reviewing");
    setCreatingResult(true);

    window.setTimeout(() => {
      if (saveConflictRef.current) {
        finishResultCreation();
        return;
      }

      setResultCalculationStep("packing");

      window.setTimeout(async () => {
        try {
          if (saveConflictRef.current) {
            finishResultCreation();
            return;
          }

          const resultId = createClientId("result");
          const inputFingerprint = createResultInputFingerprint({
            selectedSpace: optimizationInput.space,
            blocks: optimizationInput.blocks,
            fragileStackOnFragileAllowed: workspace.policy.fragileStackOnFragileAllowed
          });
          const optimizationOutput = await runPackingEngineInWorker(optimizationInput);
          const resultWarnings = createPackingResultWarnings({
            warnings: optimizationOutput.warnings,
            usedSpaceCount: optimizationOutput.usedSpaceCount,
            minimumSpaceCountLowerBound: review.totals.minimumSpaceCountLowerBound
          });

          setResultCalculationStep("rendering");
          window.setTimeout(() => {
            try {
              if (saveConflictRef.current) {
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
                    resultId,
                    runId: optimizationOutput.runId,
                    createdAt: now,
                    inputFingerprint: inputFingerprint ?? undefined,
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

              focusResultStage();
            } finally {
              finishResultCreation();
            }
          }, RESULT_PROGRESS_RENDER_DELAY_MS);
        } catch (error) {
          setResultFailure(createResultCalculationFailure(error));
          focusResultStage();
          finishResultCreation();
        }
      }, RESULT_PROGRESS_FRAME_DELAY_MS);
    }, RESULT_PROGRESS_REVIEW_DELAY_MS);
  }

  function focusCurrentWorkInputs() {
    currentWorkSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    currentWorkSectionRef.current?.focus({ preventScroll: true });
  }

  function focusSpaceInputs() {
    spaceWorkflowSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    spaceWorkflowSectionRef.current?.focus({ preventScroll: true });
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
      setWorkspaceSaveConflict(null);
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

    const exportedAtDate = new Date();
    const exportedAt = exportedAtDate.toISOString();
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
    anchor.download = createWorkspaceBackupFilename(exportedAtDate);
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
              <h1>Package Tetris</h1>
              <p>작업본을 불러오는 중입니다.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell" data-overlay-open={hasBlockingDialog ? "true" : undefined}>
      <PwaServiceWorkerRegistrar onStatusChange={setPwaOfflineStatus} />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Truck size={18} />
          </span>
                  <div>
                    <h1>Package Tetris</h1>
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
          {connectivityStatus.visible ? (
            <button
              className="status-pill status-pill-button connectivity-status-pill"
              data-tone={connectivityStatus.tone}
              aria-expanded={storagePanelOpen}
              aria-controls={STORAGE_PANEL_ID}
              aria-live="polite"
              onClick={() => setStoragePanelOpen(true)}
            >
              <WifiOff size={16} />
              {connectivityStatus.pillLabel}
            </button>
          ) : null}
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
          connectivityStatus={connectivityStatus}
          pwaOfflineStatus={pwaOfflineStatus}
          pwaInstallStatus={pwaInstallStatus}
          persistenceRequestResult={persistenceRequestResult}
          persistenceRequesting={persistenceRequesting}
          onClose={() => setStoragePanelOpen(false)}
          onExportJson={exportJson}
          onReloadLatestWorkspace={reloadLatestWorkspace}
          onRequestStorageProtection={requestBrowserStorageProtection}
          onInstallPwa={installPwaOrShowGuidance}
        />
      ) : null}

      <div className="workspace-stack" data-readonly={isWorkspaceLocked}>
        {isWorkspaceLocked ? (
          <div className="workspace-readonly-banner" role="alert">
            <div className="workspace-readonly-copy">
              <strong>{saveConflictBannerCopy?.title ?? "최신 작업본이 있어 이 화면은 잠시 멈췄습니다."}</strong>
              <span>
                {saveConflictBannerCopy?.description ??
                  "최신본을 불러오거나 현재 화면을 백업 파일로 남긴 뒤 다시 이어가세요."}
              </span>
              {saveConflictBannerCopy?.detail ? (
                <small className="workspace-readonly-detail">{saveConflictBannerCopy.detail}</small>
              ) : null}
            </div>
            <div className="workspace-readonly-actions">
              <button className="primary-button" onClick={reloadLatestWorkspace}>
                <RotateCcw size={16} />
                {saveConflictBannerCopy?.primaryLabel ?? "최신본 불러오기"}
              </button>
              <button className="secondary-button" onClick={exportJson}>
                <Download size={16} />
                {saveConflictBannerCopy?.secondaryLabel ?? "현재 화면 백업"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="workflow-progress">
          <Stepper activeStep={workspace.draft.currentStep} />
        </div>

        <section
          ref={spaceWorkflowSectionRef}
          className="panel workflow-section space-workflow-row"
          aria-labelledby="space-library-title"
          tabIndex={-1}
        >
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

        <ResetCurrentWorkDialog
          open={resetWorkDialogOpen}
          confirmDisabled={isWorkspaceLocked}
          confirmDisabledReason={isWorkspaceLocked ? "최신본을 불러온 뒤 새 작업을 시작할 수 있습니다." : null}
          onClose={closeResetCurrentWorkDialog}
          onConfirm={confirmResetCurrentWork}
        />

        <section className="panel workflow-section block-library-row" aria-labelledby="block-library-title">
          <div className="section-layout block-library-layout">
            <div className="section-column">
              <BlockCreatePanel
                form={blockForm}
                editingTemplateId={editingTemplateId}
                blockGroups={workspace.blockGroups}
                onChange={setBlockForm}
                onAddBlockGroup={addBlockGroup}
                onDeleteBlockGroup={(group, trigger) =>
                  requestDelete("block-group", group.blockGroupId, group.name, trigger)
                }
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
                blockGroups={workspace.blockGroups}
                onAddToDraft={addTemplateToDraft}
                onEdit={editBlockTemplate}
                onDeleteRequest={requestDelete}
              />
            </div>
          </div>
        </section>

        <section
          ref={currentWorkSectionRef}
          className="panel workflow-section current-work-row"
          aria-labelledby="current-work-title"
          tabIndex={-1}
        >
          <div className="section-layout current-work-layout">
            <CurrentWorkBlocksPanel
              blocks={draftBlocks}
              canResetCurrentWork={canResetCurrentWork}
              resetDisabled={isWorkspaceLocked || !canResetCurrentWork}
              resetDisabledReason={
                isWorkspaceLocked
                  ? "최신본을 불러온 뒤 새 작업을 시작할 수 있습니다."
                  : canResetCurrentWork
                    ? null
                    : "비울 현재 작업이 없습니다."
              }
              demoDisabled={isWorkspaceLocked}
              demoDisabledReason={isWorkspaceLocked ? "최신본을 불러온 뒤 시연 예제를 불러올 수 있습니다." : null}
              onQuantityChange={updateCurrentQuantity}
              onDeleteRequest={requestDelete}
              onRequestResetCurrentWork={requestResetCurrentWork}
              onLoadFieldDemo={loadFieldDemoCurrentWorkIntoDraft}
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
              creatingResult={creatingResult}
              resultCalculationProgress={resultCalculationProgress}
            />
          </div>
        </section>

        <ResultStage
          ref={resultStageRef}
          latestResult={latestResult}
          resultFailure={resultFailure}
          resultFreshnessState={resultFreshnessState}
          needsExport={needsExport}
          selectedSpace={selectedSpace}
          workspacePolicy={workspace.policy}
          review={review}
          draftBlocks={draftBlocks}
          chainHistory={workspace.chainHistory}
          pendingImport={pendingImport}
          onResolveImport={resolveImport}
          onExportJson={exportJson}
          onEditInputs={focusCurrentWorkInputs}
          onReviewSpaceOffset={focusSpaceInputs}
          onCreateResult={createPackingResult}
          resultCreating={creatingResult}
          resultCalculationProgress={resultCalculationProgress}
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

      <div className="sticky-mobile-actions" role="region" aria-label="모바일 주요 작업">
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
          <div className="sticky-mobile-copy" role="status" aria-live="polite" aria-atomic="true">
            <strong id={MOBILE_STICKY_STATUS_ID}>{mobileStickyAction.statusLabel}</strong>
            <span id={MOBILE_STICKY_HELPER_ID}>{mobileStickyAction.helperLabel}</span>
          </div>
        </div>
        <button
          className="primary-button sticky-mobile-primary"
          onClick={runMobileStickyAction}
          disabled={mobileStickyAction.disabled}
          aria-label={getMobileStickyActionAriaLabel(mobileStickyAction.action, mobileStickyAction.buttonLabel)}
          aria-describedby={`${MOBILE_STICKY_STATUS_ID} ${MOBILE_STICKY_HELPER_ID}`}
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
  blockGroups,
  onAddToDraft,
  onEdit,
  onDeleteRequest
}: {
  templates: BlockTemplate[];
  blockGroups: BlockGroup[];
  onAddToDraft: (template: BlockTemplate, quantity?: number) => void;
  onEdit: (template: BlockTemplate) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  const [blockLibraryDialogOpen, setBlockLibraryDialogOpen] = useState(false);

  const handleEdit = (template: BlockTemplate) => {
    setBlockLibraryDialogOpen(false);
    onEdit(template);
  };

  const handleDeleteRequest = (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => {
    setBlockLibraryDialogOpen(false);
    onDeleteRequest(kind, entityId, name, trigger);
  };

  return (
    <section className="rail-section block-template-library">
      <h3>저장된 박스</h3>
      <p className="panel-subtitle">저장한 박스를 팝업에서 검색하고 이번 작업에 추가합니다.</p>
      <div className="block-library-summary-card">
        <div>
          <strong>{templates.length === 0 ? "저장된 박스 0개" : `저장된 박스 ${templates.length}개`}</strong>
          <span className="fine-print">상위/하위 그룹과 검색으로 필요한 박스를 찾습니다.</span>
        </div>
        <button
          className="primary-button"
          aria-haspopup="dialog"
          aria-controls="block-library-dialog"
          onClick={() => setBlockLibraryDialogOpen(true)}
          disabled={templates.length === 0}
        >
          <PackagePlus size={16} />
          저장된 박스 찾아 추가
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="fine-print">저장된 박스가 없습니다. 왼쪽 입력 영역에서 첫 박스를 저장하세요.</p>
      ) : null}
      <BlockLibraryDialog
        open={blockLibraryDialogOpen}
        templates={templates}
        blockGroups={blockGroups}
        onClose={() => setBlockLibraryDialogOpen(false)}
        onAddToDraft={onAddToDraft}
        onEdit={handleEdit}
        onDeleteRequest={handleDeleteRequest}
      />
    </section>
  );
}

function BlockLibraryDialog({
  open,
  templates,
  blockGroups,
  onClose,
  onAddToDraft,
  onEdit,
  onDeleteRequest
}: {
  open: boolean;
  templates: BlockTemplate[];
  blockGroups: BlockGroup[];
  onClose: () => void;
  onAddToDraft: (template: BlockTemplate, quantity?: number) => void;
  onEdit: (template: BlockTemplate) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [blockLibrarySearchTerm, setBlockLibrarySearchTerm] = useState("");
  const [blockLibraryGroup1Filter, setBlockLibraryGroup1Filter] = useState("");
  const [blockLibraryGroup2Filter, setBlockLibraryGroup2Filter] = useState("");
  const [blockLibraryPage, setBlockLibraryPage] = useState(1);
  const blockLibraryGroup1Options = useMemo(() => createTopBlockGroups(blockGroups), [blockGroups]);
  const blockLibraryGroup2Options = useMemo(
    () => createChildBlockGroups(blockGroups, blockLibraryGroup1Filter),
    [blockGroups, blockLibraryGroup1Filter]
  );
  const searchedTemplates = searchBlockTemplates(templates, blockLibrarySearchTerm);
  const visibleTemplates = searchedTemplates.filter((template) => {
    const matchesGroup1 = !blockLibraryGroup1Filter || template.group1 === blockLibraryGroup1Filter;
    const matchesGroup2 = !blockLibraryGroup2Filter || template.group2 === blockLibraryGroup2Filter;
    return matchesGroup1 && matchesGroup2;
  });
  const blockLibraryPageCount = Math.max(1, Math.ceil(visibleTemplates.length / BLOCK_LIBRARY_PAGE_SIZE));
  const currentBlockLibraryPage = Math.min(blockLibraryPage, blockLibraryPageCount);
  const blockLibraryPageStart = (currentBlockLibraryPage - 1) * BLOCK_LIBRARY_PAGE_SIZE;
  const pagedTemplates = visibleTemplates.slice(
    blockLibraryPageStart,
    blockLibraryPageStart + BLOCK_LIBRARY_PAGE_SIZE
  );

  useEffect(() => {
    setBlockLibraryPage(1);
  }, [blockLibraryGroup1Filter, blockLibraryGroup2Filter, blockLibrarySearchTerm]);

  useEffect(() => {
    if (blockLibraryPage > blockLibraryPageCount) {
      setBlockLibraryPage(blockLibraryPageCount);
    }
  }, [blockLibraryPage, blockLibraryPageCount]);

  useEffect(() => {
    if (
      blockLibraryGroup2Filter &&
      !blockLibraryGroup2Options.some((group) => group.name === blockLibraryGroup2Filter)
    ) {
      setBlockLibraryGroup2Filter("");
    }
  }, [blockLibraryGroup2Filter, blockLibraryGroup2Options]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => {
        dialog.querySelector<HTMLInputElement>("[data-block-library-search='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="block-library-dialog"
      ref={dialogRef}
      className="block-library-dialog"
      aria-modal="true"
      aria-labelledby="block-library-dialog-title"
      onClose={onClose}
    >
      <div className="block-library-dialog-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id="block-library-dialog-title">저장된 박스 찾기</h2>
            <p className="fine-print">검색하거나 그룹을 좁힌 뒤 이번 작업에 추가합니다.</p>
          </div>
          <button className="icon-button" data-block-library-close="true" onClick={onClose} aria-label="저장된 박스 찾기 닫기">
            <X size={18} />
          </button>
        </div>
        <div className="block-library-dialog-body">
          <div className="block-library-dialog-tools">
            <label className="block-library-search">
              저장된 박스 찾기
              <input
                data-block-library-search="true"
                aria-label="저장된 박스 검색"
                placeholder="박스명, 치수, 무게, 그룹 검색"
                value={blockLibrarySearchTerm}
                onChange={(event) => setBlockLibrarySearchTerm(event.target.value)}
              />
            </label>
            <div className="block-library-filters" aria-label="저장된 박스 그룹 필터">
              <label>
                상위그룹
                <select
                  aria-label="상위그룹 필터"
                  value={blockLibraryGroup1Filter}
                  onChange={(event) => {
                    setBlockLibraryGroup1Filter(event.target.value);
                    setBlockLibraryGroup2Filter("");
                  }}
                >
                  <option value="">전체 상위그룹</option>
                  {blockLibraryGroup1Options.map((group) => (
                    <option key={group.blockGroupId} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                하위그룹
                <select
                  aria-label="하위그룹 필터"
                  value={blockLibraryGroup2Filter}
                  onChange={(event) => setBlockLibraryGroup2Filter(event.target.value)}
                  disabled={!blockLibraryGroup1Filter}
                >
                  <option value="">전체 하위그룹</option>
                  {blockLibraryGroup2Options.map((group) => (
                    <option key={group.blockGroupId} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <p className="fine-print">
            검색 결과 {visibleTemplates.length}개 / 전체 {templates.length}개 · {currentBlockLibraryPage}/
            {blockLibraryPageCount} 페이지
          </p>
          <div className="block-library-dialog-list">
            {visibleTemplates.length === 0 ? (
              <p className="fine-print">검색 결과가 없습니다. 다른 이름이나 치수로 찾아보세요.</p>
            ) : (
              pagedTemplates.map((template) => (
                <article key={template.blockTemplateId} className="library-card">
                  <div className="card-heading">
                    <strong>{template.name}</strong>
                    {template.fragile ? (
                      <span className="badge" data-tone="amber">
                        깨짐주의
                      </span>
                    ) : (
                      <span className="badge">일반</span>
                    )}
                  </div>
                  <p className="meta">{createBlockTemplateCardMeta(template).join(" · ")}</p>
                  <div className="form-actions">
                    <button className="primary-button" onClick={() => onAddToDraft(template, 1)}>
                      이번 작업에 추가
                    </button>
                    <button className="secondary-button" onClick={() => onEdit(template)}>
                      수정
                    </button>
                    <button
                      className="danger-button"
                      aria-label={`저장된 박스 ${template.name} 삭제`}
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
          <div className="block-library-pagination" aria-label="저장된 박스 페이지 이동">
            <button
              className="secondary-button"
              onClick={() => setBlockLibraryPage((page) => Math.max(1, page - 1))}
              disabled={currentBlockLibraryPage <= 1}
            >
              이전 페이지
            </button>
            <span>
              {currentBlockLibraryPage} / {blockLibraryPageCount}
            </span>
            <button
              className="secondary-button"
              onClick={() => setBlockLibraryPage((page) => Math.min(blockLibraryPageCount, page + 1))}
              disabled={currentBlockLibraryPage >= blockLibraryPageCount}
            >
              다음 페이지
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function BlockCreatePanel({
  form,
  editingTemplateId,
  blockGroups,
  onChange,
  onAddBlockGroup,
  onDeleteBlockGroup,
  onSave,
  onCancel
}: {
  form: BlockForm;
  editingTemplateId: string | null;
  blockGroups: BlockGroup[];
  onChange: (value: BlockForm) => void;
  onAddBlockGroup: (name: string, parentGroupId: string | null) => void;
  onDeleteBlockGroup: (group: BlockGroup, trigger?: HTMLElement | null) => void;
  onSave: (addToDraft: boolean) => void;
  onCancel: () => void;
}) {
  const [blockGroupRegister, setBlockGroupRegister] = useState({
    topName: "",
    parentGroupId: "",
    childName: ""
  });
  const topBlockGroups = useMemo(() => createTopBlockGroups(blockGroups), [blockGroups]);
  const childBlockGroups = useMemo(() => createChildBlockGroups(blockGroups, form.group1), [blockGroups, form.group1]);

  const saveTopGroup = () => {
    const groupName = blockGroupRegister.topName.trim();

    if (!groupName) {
      return;
    }

    onAddBlockGroup(groupName, null);
    onChange({ ...form, group1: groupName, group2: "" });
    setBlockGroupRegister((current) => ({ ...current, topName: "" }));
  };

  const saveChildGroup = () => {
    const groupName = blockGroupRegister.childName.trim();

    if (!groupName || !blockGroupRegister.parentGroupId) {
      return;
    }

    const parentGroup = blockGroups.find((group) => group.blockGroupId === blockGroupRegister.parentGroupId);
    onAddBlockGroup(groupName, blockGroupRegister.parentGroupId);

    if (parentGroup) {
      onChange({ ...form, group1: parentGroup.name, group2: groupName });
    }

    setBlockGroupRegister((current) => ({ ...current, childName: "" }));
  };

  return (
    <section>
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          2
        </span>
        <div>
          <h2 id="block-library-title">{getWorkspaceSectionTitle("blocks")}</h2>
          <p className="panel-subtitle">박스 크기와 분류 정보를 저장합니다. 수량은 이번 작업에 넣을 때 조정합니다.</p>
        </div>
      </div>
      <div className="block-template-form-rows block-template-form">
        <div className="form-row form-row-two block-template-name-row">
          <label>
            박스명
            <input
              placeholder="예: 스피커 박스"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            무게(kg)
            <input
              aria-label="박스 무게 kg"
              inputMode="decimal"
              min="0"
              placeholder="선택 입력"
              step="0.1"
              type="number"
              value={form.weightKg}
              onClick={selectNumberFieldValue}
              onFocus={selectNumberFieldValue}
              onChange={(event) => onChange({ ...form, weightKg: event.target.value })}
            />
          </label>
        </div>
        <div className="form-row form-row-three block-template-dimension-row">
          <label>
            가로(mm)
            <NumberFieldInput
              aria-label="박스 가로 mm"
              min={1}
              value={form.widthMm}
              onValidValueChange={(widthMm) => onChange({ ...form, widthMm })}
            />
          </label>
          <label>
            세로(mm)
            <NumberFieldInput
              aria-label="박스 세로 mm"
              min={1}
              value={form.depthMm}
              onValidValueChange={(depthMm) => onChange({ ...form, depthMm })}
            />
          </label>
          <label>
            높이(mm)
            <NumberFieldInput
              aria-label="박스 높이 mm"
              min={1}
              value={form.heightMm}
              onValidValueChange={(heightMm) => onChange({ ...form, heightMm })}
            />
          </label>
        </div>
        <div className="form-row form-row-two block-template-group-row">
          <label>
            상위그룹
            <select
              aria-label="박스 상위그룹 선택"
              value={form.group1}
              onChange={(event) => onChange({ ...form, group1: event.target.value, group2: "" })}
            >
              <option value="">상위그룹 없음</option>
              {topBlockGroups.map((group) => (
                <option key={group.blockGroupId} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            하위그룹
            <select
              aria-label="박스 하위그룹 선택"
              value={form.group2}
              onChange={(event) => onChange({ ...form, group2: event.target.value })}
              disabled={!form.group1}
            >
              <option value="">하위그룹 없음</option>
              {childBlockGroups.map((group) => (
                <option key={group.blockGroupId} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-line block-template-fragile-row">
          <input
            type="checkbox"
            checked={form.fragile}
            onChange={(event) => onChange({ ...form, fragile: event.target.checked })}
          />
          깨짐주의
        </label>
      </div>
      <details className="block-group-register">
        <summary>새 그룹 등록</summary>
        <div className="block-group-register-grid">
          <label>
            새 상위그룹명
            <input
              placeholder="예: 금영"
              value={blockGroupRegister.topName}
              onChange={(event) =>
                setBlockGroupRegister((current) => ({ ...current, topName: event.target.value }))
              }
            />
          </label>
          <button className="secondary-button" onClick={saveTopGroup} disabled={!blockGroupRegister.topName.trim()}>
            상위그룹 추가
          </button>
          <label>
            하위그룹을 넣을 상위
            <select
              value={blockGroupRegister.parentGroupId}
              onChange={(event) =>
                setBlockGroupRegister((current) => ({ ...current, parentGroupId: event.target.value }))
              }
            >
              <option value="">상위그룹 선택</option>
              {topBlockGroups.map((group) => (
                <option key={group.blockGroupId} value={group.blockGroupId}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            새 하위그룹명
            <input
              placeholder="예: 스피커"
              value={blockGroupRegister.childName}
              onChange={(event) =>
                setBlockGroupRegister((current) => ({ ...current, childName: event.target.value }))
              }
            />
          </label>
          <button
            className="secondary-button"
            onClick={saveChildGroup}
            disabled={!blockGroupRegister.parentGroupId || !blockGroupRegister.childName.trim()}
          >
            하위그룹 추가
          </button>
        </div>
        <div className="block-group-manager" aria-label="등록된 그룹 관리">
          {topBlockGroups.length === 0 ? (
            <p className="fine-print">등록된 그룹이 아직 없습니다.</p>
          ) : (
            topBlockGroups.map((group) => {
              const children = blockGroups
                .filter((candidate) => candidate.parentGroupId === group.blockGroupId)
                .sort(compareBlockGroupNames);

              return (
                <article className="block-group-card" key={group.blockGroupId}>
                  <div className="block-group-card-head">
                    <strong>{group.name}</strong>
                    <button
                      className="danger-button icon-button"
                      aria-label={`상위 그룹 ${group.name} 삭제`}
                      onClick={(event) => onDeleteBlockGroup(group, event.currentTarget)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="block-group-children">
                    {children.length === 0 ? (
                      <span className="fine-print">하위 그룹 없음</span>
                    ) : (
                      children.map((childGroup) => (
                        <span className="block-group-chip" key={childGroup.blockGroupId}>
                          {childGroup.name}
                          <button
                            className="danger-button icon-button"
                            aria-label={`하위 그룹 ${childGroup.name} 삭제`}
                            onClick={(event) => onDeleteBlockGroup(childGroup, event.currentTarget)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </details>
      <div className="form-actions">
        <button className="primary-button" onClick={() => onSave(true)}>
          <PackagePlus size={16} />
          {editingTemplateId ? "박스 수정" : "저장 후 1개 추가"}
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
  canResetCurrentWork,
  resetDisabled,
  resetDisabledReason,
  demoDisabled,
  demoDisabledReason,
  onQuantityChange,
  onDeleteRequest,
  onRequestResetCurrentWork,
  onLoadFieldDemo
}: {
  blocks: BlockDefinition[];
  canResetCurrentWork: boolean;
  resetDisabled: boolean;
  resetDisabledReason: string | null;
  demoDisabled: boolean;
  demoDisabledReason: string | null;
  onQuantityChange: (draftBlockItemId: string, quantity: number) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
  onRequestResetCurrentWork: () => void;
  onLoadFieldDemo: () => void;
}) {
  return (
    <section className="current-block-panel">
      <div className="current-work-head">
        <div className="section-head">
          <span className="section-index" aria-hidden="true">
            3
          </span>
          <div>
            <h2 id="current-work-title">{getWorkspaceSectionTitle("review")}</h2>
                    <p className="panel-subtitle">이번에 실을 박스입니다. 수량 변경은 현재 작업에만 적용됩니다.</p>
          </div>
        </div>
        <div className="current-work-actions">
          <button
            className="secondary-button current-work-demo-action"
            onClick={onLoadFieldDemo}
            disabled={demoDisabled}
            title={demoDisabledReason ?? undefined}
            aria-describedby={demoDisabled ? "current-work-demo-disabled-reason" : undefined}
          >
            <Truck size={16} />
            시연 예제 불러오기
          </button>
          {demoDisabled ? (
            <span id="current-work-demo-disabled-reason" className="sr-only">
              최신본을 불러온 뒤 시연 예제를 불러올 수 있습니다.
            </span>
          ) : null}
          <button
            className="secondary-button current-work-reset-action"
            onClick={onRequestResetCurrentWork}
            disabled={resetDisabled}
            title={resetDisabledReason ?? undefined}
            aria-describedby={canResetCurrentWork ? undefined : "current-work-reset-disabled-reason"}
          >
            <RotateCcw size={16} />
            새 작업 시작
          </button>
          {!canResetCurrentWork ? (
            <span id="current-work-reset-disabled-reason" className="sr-only">
              비울 현재 작업이 없습니다.
            </span>
          ) : null}
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
                  이번 작업 수량(개)
                  <NumberFieldInput
                    aria-label="이번 작업 수량 개"
                    min={1}
                    value={block.quantity}
                    onValidValueChange={(quantity) => onQuantityChange(block.draftBlockItemId, quantity)}
                  />
                </label>
                <div className="summary-tile compact">
                  <span>총 부피</span>
                  <strong>{formatBlockVolumeM3(block)}</strong>
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

function ResetCurrentWorkDialog({
  open,
  confirmDisabled,
  confirmDisabledReason,
  onClose,
  onConfirm
}: {
  open: boolean;
  confirmDisabled: boolean;
  confirmDisabledReason: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="reset-work-dialog"
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
      <div className="reset-work-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id={titleId}>현재 작업을 새로 시작할까요?</h2>
            <p id={descriptionId} className="fine-print">
              이번 작업 박스, 계산 결과, 추가 적재 기록만 비웁니다. 저장된 공간과 박스는 그대로 둡니다.
            </p>
            {confirmDisabledReason ? (
              <p className="form-error" role="alert">
                {confirmDisabledReason}
              </p>
            ) : null}
          </div>
          <button className="icon-button panel-close-button" onClick={onClose} aria-label="새 작업 시작 닫기">
            <X size={16} />
          </button>
        </div>
        <div className="form-actions reset-work-actions">
          <button data-cancel-button="true" className="secondary-button" autoFocus onClick={onClose}>
            취소
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={confirmDisabled}>
            <RotateCcw size={16} />
            현재 작업 비우기
          </button>
        </div>
      </div>
    </dialog>
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
  onCreateResult,
  creatingResult,
  resultCalculationProgress
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
  creatingResult: boolean;
  resultCalculationProgress: ResultCalculationProgressCopy;
}) {
  const statusTone = review?.status === "error" ? "red" : review?.status === "warning" ? "amber" : "green";
  const statusLabel =
    review?.status === "error" ? "입력 보완 필요" : review?.status === "warning" ? "주의 후 실행 가능" : "실행 가능";
  const resultButtonDisabled = creatingResult || Boolean(saveConflict) || (review?.cta.disabled ?? true);
  const resultButtonTitle = creatingResult
    ? "결과를 계산하고 있습니다."
    : saveConflict
      ? "최신 작업본을 불러온 뒤 실행할 수 있습니다."
      : (review?.cta.disabledReason ?? undefined);
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
      {creatingResult ? (
        <div className="result-calculation-progress" role="status" aria-live="polite">
          <strong>{resultCalculationProgress.statusLabel}</strong>
          <span>{resultCalculationProgress.description}</span>
        </div>
      ) : null}
      <div className="form-actions" aria-live="polite">
        <button
          className="primary-button"
          onClick={onCreateResult}
          disabled={resultButtonDisabled}
          aria-label={creatingResult ? "실행 전 확인에서 결과 계산 중" : "실행 전 확인에서 결과 만들기"}
          title={resultButtonTitle}
        >
          <Box size={16} />
          {creatingResult ? resultCalculationProgress.buttonLabel : "결과 만들기"}
        </button>
      </div>
    </section>
  );
}

const ResultStage = ({
  latestResult,
  resultFailure,
  resultFreshnessState,
  needsExport,
  selectedSpace,
  workspacePolicy,
  review,
  draftBlocks,
  chainHistory,
  pendingImport,
  onResolveImport,
  onExportJson,
  onEditInputs,
  onReviewSpaceOffset,
  onCreateResult,
  resultCreating,
  resultCalculationProgress,
  onConfirmChainSimulation,
  onUndoLastChainAddition,
  ref
}: {
  latestResult: TetrisWorkspace["recentResults"][number] | null;
  resultFailure: ResultCalculationFailure | null;
  resultFreshnessState: ResultFreshnessState;
  needsExport: boolean;
  selectedSpace: SpaceDefinition | undefined;
  workspacePolicy: TetrisWorkspace["policy"];
  review: ReviewGateResult | null;
  draftBlocks: BlockDefinition[];
  chainHistory: ChainHistoryItem[];
  pendingImport: PendingImport | null;
  onResolveImport: (option: ImportConflictOption) => void;
  onExportJson: () => void;
  onEditInputs: () => void;
  onReviewSpaceOffset: () => void;
  onCreateResult: () => void;
  resultCreating: boolean;
  resultCalculationProgress: ResultCalculationProgressCopy;
  onConfirmChainSimulation: (preview: ChainSimulationOutput, resultId: string) => void;
  onUndoLastChainAddition: (resultId: string) => void;
  ref: React.Ref<HTMLElement>;
}) => {
  const [projectionView, setProjectionView] = useState<ProjectionView>("top");
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>("three");
  const [threeCameraPreset, setThreeCameraPreset] = useState<ThreeCameraPreset>("isometric");
  const [threeResetToken, setThreeResetToken] = useState(0);
  const [threeDialogOpen, setThreeDialogOpen] = useState(false);
  const [resultInspectionDialog, setResultInspectionDialog] = useState<ResultInspectionDialogKind | null>(null);
  const [selectedSpaceInstanceId, setSelectedSpaceInstanceId] = useState<string | null>(null);
  const [selectedBlockTemplateId, setSelectedBlockTemplateId] = useState<string | null>(null);
  const [selectedChainTemplateId, setSelectedChainTemplateId] = useState<string | null>(null);
  const [chainPreview, setChainPreview] = useState<ChainSimulationOutput | null>(null);
  const [chainComparisonMode, setChainComparisonMode] = useState<ChainComparisonMode>("preview");
  const [chainStatus, setChainStatus] = useState<"idle" | "calculating" | "preview" | "empty" | "error">("idle");
  const [chainStatusMessage, setChainStatusMessage] = useState("추가할 박스 1개를 선택하세요.");
  const [chainRequestedQuantity, setChainRequestedQuantity] = useState(1);
  const [instructionCopyStatus, setInstructionCopyStatus] = useState<InstructionCopyStatus>("idle");
  const [instructionDownloadStatus, setInstructionDownloadStatus] = useState<InstructionDownloadStatus>("idle");
  const [instructionDownloadFilename, setInstructionDownloadFilename] = useState<string | null>(null);
  const [offsetRecommendation, setOffsetRecommendation] = useState<ResultSpaceAdjustmentRecommendation | null>(null);
  const [offsetPreviewDialogOpen, setOffsetPreviewDialogOpen] = useState(false);
  const threeDialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const resultInspectionDialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const offsetPreviewDialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const packedSpaces = latestResult?.spaces ?? [];
  const isChainComparisonActive = Boolean(chainPreview && chainPreview.addedQuantity > 0);
  const displayedSpaces = useMemo(
    () =>
      resolveChainComparisonSpaces({
        mode: chainComparisonMode,
        originalSpaces: packedSpaces,
        previewSpaces: chainPreview?.spaces ?? null
      }),
    [chainComparisonMode, chainPreview?.spaces, packedSpaces]
  );
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
  const remainingVolumeLabel =
    latestResult && usableSize
      ? formatVolumeM3(calculateResultRemainingVolumeM3(latestResult.spaces ?? [], usableSize))
      : "-";
  const chainBlockOptions = useMemo(() => createChainBlockOptions(draftBlocks), [draftBlocks]);
  const selectedChainTemplate =
    chainBlockOptions.find((template) => template.blockTemplateId === selectedChainTemplateId) ?? null;
  const latestResultChainHistory = latestResult
    ? chainHistory.filter((item) => item.resultId === latestResult.resultId)
    : [];
  const latestChainItem = latestResultChainHistory[0] ?? null;
  const chainPreviewBlockIds = useMemo(() => {
    if (!chainPreview || chainComparisonMode === "original") {
      return new Set<string>();
    }

    return new Set(
      chainPreview.spaces.flatMap((space) =>
        space.blocks.filter((block) => block.blockId.startsWith(chainPreview.runId)).map((block) => block.blockId)
      )
    );
  }, [chainComparisonMode, chainPreview]);
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
  const stackingLayerSummaries = useMemo(
    () => (selectedPackedSpace ? createStackingLayerSummaries(selectedPackedSpace) : []),
    [selectedPackedSpace]
  );
  const stackingInstructionSteps = useMemo(
    () => (selectedPackedSpace ? createStackingInstructionSteps(selectedPackedSpace) : []),
    [selectedPackedSpace]
  );
  const placementDetailRows = useMemo(
    () => (selectedPackedSpace ? createPlacementDetailRows(selectedPackedSpace) : []),
    [selectedPackedSpace]
  );
  const stackingInstructionSpaceLabel = useMemo(
    () => createStackingInstructionSpaceLabel(resultSpace?.name, selectedPackedSpaceIndex),
    [resultSpace?.name, selectedPackedSpaceIndex]
  );
  const safetySpaceSplitWarning =
    latestResult?.warnings?.find((warning) => warning === SPACE_SPLIT_FLOOR_SUPPORT_WARNING) ?? null;
  const resultWarnings =
    latestResult?.warnings?.filter((warning) => warning !== SPACE_SPLIT_FLOOR_SUPPORT_WARNING) ?? [];
  const resultWarningSummary = useMemo(() => createResultWarningSummary(resultWarnings), [resultWarnings]);
  const unloadedWarningSummary = latestResult?.unloadedBlockCount ? resultWarningSummary : [];
  const stackingInstructionWarningMessages = useMemo(
    () => [
      ...(safetySpaceSplitWarning ? [safetySpaceSplitWarning] : []),
      ...resultWarningSummary.map((warning) =>
        warning.count > 1 ? `${warning.message} · ${warning.count}건` : warning.message
      )
    ],
    [resultWarningSummary, safetySpaceSplitWarning]
  );
  const stackingInstructionText = useMemo(
    () =>
      createStackingInstructionText(
        stackingInstructionSpaceLabel,
        stackingInstructionSteps,
        {
          calculatedAtLabel: latestResult?.createdAt
            ? formatStackingInstructionCalculatedAt(latestResult.createdAt)
            : undefined,
          unloadedBlockCount: latestResult?.unloadedBlockCount ?? 0,
          warnings: stackingInstructionWarningMessages
        }
      ),
    [
      latestResult?.createdAt,
      latestResult?.unloadedBlockCount,
      stackingInstructionSpaceLabel,
      stackingInstructionSteps,
      stackingInstructionWarningMessages
    ]
  );
  const resultActionCtaDisabled = resultCreating || resultFreshnessState.ctaDisabled;
  const resultActionCtaTitle = resultCreating
    ? "결과를 계산하고 있습니다."
    : (resultFreshnessState.ctaDisabledReason ?? undefined);
  const resultActionCtaLabel = latestResult ? "다시 계산" : "결과 만들기";
  const resultActionDescription = latestResult
    ? "입력값을 바꾸거나 현재 조건으로 다시 계산할 수 있습니다."
    : "입력을 확인한 뒤 결과를 만들 수 있습니다.";
  const fieldHandoffChecklist = useMemo(
    () =>
      createFieldHandoffChecklist({
        hasResult: Boolean(latestResult),
        resultFreshnessStatus: resultFreshnessState.status,
        resultActionDisabled: resultActionCtaDisabled,
        unloadedBlockCount: latestResult?.unloadedBlockCount ?? 0,
        warningCount: stackingInstructionWarningMessages.length,
        instructionPrepared: instructionCopyStatus === "copied" || instructionDownloadStatus === "downloaded",
        needsExport
      }),
    [
      instructionCopyStatus,
      instructionDownloadStatus,
      latestResult,
      needsExport,
      resultActionCtaDisabled,
      resultFreshnessState.status,
      stackingInstructionWarningMessages.length
    ]
  );
  const recommendationCopy = offsetRecommendation ? createResultSpaceRecommendationCopy(offsetRecommendation) : null;

  useEffect(() => {
    setResultViewMode("three");
    setThreeCameraPreset("isometric");
    setThreeResetToken((value) => value + 1);
    setProjectionView("top");
    setSelectedSpaceInstanceId(latestResult?.spaces?.[0]?.spaceInstanceId ?? null);
    setSelectedBlockTemplateId(null);
    setSelectedChainTemplateId(null);
    setChainPreview(null);
    setChainComparisonMode("preview");
    setThreeDialogOpen(false);
    setResultInspectionDialog(null);
    setChainStatus("idle");
    setChainStatusMessage("추가할 박스 1개를 선택하세요.");
    setInstructionCopyStatus("idle");
    setInstructionDownloadStatus("idle");
    setInstructionDownloadFilename(null);
    setOffsetPreviewDialogOpen(false);
  }, [latestResult?.resultId]);

  useEffect(() => {
    setInstructionCopyStatus("idle");
    setInstructionDownloadStatus("idle");
    setInstructionDownloadFilename(null);
  }, [stackingInstructionText]);

  useEffect(() => {
    if (!offsetRecommendation) {
      setOffsetPreviewDialogOpen(false);
    }
  }, [offsetRecommendation]);

  useEffect(() => {
    let cancelled = false;

    async function calculateOffsetRecommendation() {
      if (!latestResult || !resultSpace || resultFreshnessState.status === "stale") {
        setOffsetRecommendation(null);
        return;
      }

      const recommendationSpaces =
        isChainComparisonActive && chainComparisonMode === "preview" ? displayedSpaces : packedSpaces;
      const recommendationPolicy = {
        fragileStackOnFragileAllowed: workspacePolicy.fragileStackOnFragileAllowed,
        nonFragileOnFragileAllowed: false,
        rotation: "orthogonal-90deg"
      } as const;

      setOffsetRecommendation(null);

      try {
        const overhangRecommendation = await createOverhangPalletRecommendation({
          space: resultSpace,
          blocks: draftBlocks,
          spaces: packedSpaces,
          unloadedBlockCount: latestResult.unloadedBlockCount,
          policy: recommendationPolicy,
          runPackingEngine: runPackingEngineInWorker
        });

        if (!cancelled && overhangRecommendation) {
          setOffsetRecommendation(overhangRecommendation);
          return;
        }

        if (latestResult.unloadedBlockCount > 0) {
          if (!cancelled) {
            setOffsetRecommendation(null);
          }
          return;
        }

        const recommendation = await createOffsetAdjustmentRecommendation({
          space: resultSpace,
          spaces: recommendationSpaces,
          policy: recommendationPolicy,
          runPackingEngine: runPackingEngineInWorker
        });

        if (!cancelled) {
          setOffsetRecommendation(recommendation);
        }
      } catch {
        if (!cancelled) {
          setOffsetRecommendation(null);
        }
      }
    }

    void calculateOffsetRecommendation();

    return () => {
      cancelled = true;
    };
  }, [
    chainComparisonMode,
    displayedSpaces,
    draftBlocks,
    isChainComparisonActive,
    latestResult,
    packedSpaces,
    resultFreshnessState.status,
    resultSpace,
    workspacePolicy.fragileStackOnFragileAllowed
  ]);

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

  function selectResultViewControl(controlId: ResultViewControlId) {
    if (controlId === "reset") {
      resetResultViewer();
      return;
    }

    if (controlId === "three") {
      setResultViewMode("three");
      return;
    }

    if (isProjectionViewControlId(controlId)) {
      selectProjectionView(controlId);
      return;
    }

    const exhaustiveControlId: never = controlId;
    return exhaustiveControlId;
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

  function openExpandedThreeView(trigger: HTMLButtonElement) {
    threeDialogTriggerRef.current = trigger;
    setThreeDialogOpen(true);
  }

  function closeExpandedThreeView({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
    setThreeDialogOpen(false);

    if (restoreFocus) {
      window.setTimeout(() => {
        threeDialogTriggerRef.current?.focus();
      }, 0);
    }
  }

  function openResultInspectionDialog(kind: ResultInspectionDialogKind, trigger: HTMLButtonElement) {
    resultInspectionDialogTriggerRef.current = trigger;
    setResultInspectionDialog(kind);
  }

  function closeResultInspectionDialog({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
    setResultInspectionDialog(null);

    if (restoreFocus) {
      window.setTimeout(() => {
        resultInspectionDialogTriggerRef.current?.focus();
      }, 0);
    }
  }

  function handleFieldHandoffAction(action: FieldHandoffChecklistAction, event: MouseEvent<HTMLButtonElement>) {
    if (action === "create-result" || action === "recalculate") {
      onCreateResult();
      return;
    }

    if (action === "open-instructions") {
      openResultInspectionDialog("stacking", event.currentTarget);
      return;
    }

    if (action === "export-backup") {
      onExportJson();
      return;
    }

    const exhaustiveAction: never = action;
    return exhaustiveAction;
  }

  function isFieldHandoffActionDisabled(action: FieldHandoffChecklistAction) {
    if (action === "create-result" || action === "recalculate") {
      return resultActionCtaDisabled;
    }

    if (action === "open-instructions") {
      return !latestResult;
    }

    if (action === "export-backup") {
      return false;
    }

    const exhaustiveAction: never = action;
    return exhaustiveAction;
  }

  function openOffsetPreviewDialog(trigger: HTMLButtonElement) {
    offsetPreviewDialogTriggerRef.current = trigger;
    setOffsetPreviewDialogOpen(true);
  }

  function closeOffsetPreviewDialog({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
    setOffsetPreviewDialogOpen(false);

    if (restoreFocus) {
      window.setTimeout(() => {
        offsetPreviewDialogTriggerRef.current?.focus();
      }, 0);
    }
  }

  function openTopFallbackFromExpanded() {
    closeExpandedThreeView({ restoreFocus: false });
    selectProjectionView("top");
  }

  async function copyStackingInstructions() {
    if (!stackingInstructionText) {
      return;
    }

    try {
      await writeClipboardText(stackingInstructionText);
      setInstructionCopyStatus("copied");
    } catch {
      setInstructionCopyStatus("error");
    }
  }

  function downloadStackingInstructions() {
    if (!stackingInstructionText) {
      return;
    }

    try {
      const filename = createStackingInstructionFilename(selectedPackedSpaceIndex, new Date(), resultSpace?.name);

      downloadTextFile({
        text: stackingInstructionText,
        filename
      });
      setInstructionDownloadFilename(filename);
      setInstructionDownloadStatus("downloaded");
    } catch {
      setInstructionDownloadFilename(null);
      setInstructionDownloadStatus("error");
    }
  }

  function selectChainTemplate(blockTemplateId: string) {
    setSelectedChainTemplateId(blockTemplateId);
    setChainPreview(null);
    setChainComparisonMode("preview");
    setChainStatus("idle");
    setSelectedBlockTemplateId(null);
    setChainStatusMessage(
      chainPreview ? "다른 박스를 선택해서 미리보기를 새로 계산합니다." : "최대 적재 계산 또는 지정 수량 계산을 실행하세요."
    );
  }

  function calculateChainPreview() {
    calculateChainPreviewWithQuantity();
  }

  function calculateRequestedChainPreview() {
    calculateChainPreviewWithQuantity(chainRequestedQuantity);
  }

  function changeChainRequestedQuantity(quantity: number) {
    setChainRequestedQuantity(quantity);

    if (!chainPreview) {
      return;
    }

    setChainPreview(null);
    setChainComparisonMode("preview");
    setSelectedBlockTemplateId(null);
    setChainStatus("idle");
    setChainStatusMessage("수량이 바뀌었습니다. 다시 계산하세요.");
  }

  function calculateChainPreviewWithQuantity(requestedQuantity?: number) {
    if (!latestResult || !selectedChainTemplate) {
      setChainStatus("idle");
      setChainStatusMessage("박스를 선택해야 계산할 수 있습니다.");
      return;
    }

    setChainStatus("calculating");
    setChainStatusMessage(
      requestedQuantity ? `${requestedQuantity}개 추가 기준으로 계산하고 있습니다.` : "남은 공간 기준으로 계산하고 있습니다."
    );

    window.setTimeout(() => {
      try {
        const preview = runChainSimulationV0({
          result: latestResult,
          blockTemplate: selectedChainTemplate,
          runId: createClientId("chain-run"),
          policy: {
            fragileStackOnFragileAllowed: workspacePolicy.fragileStackOnFragileAllowed,
            nonFragileOnFragileAllowed: false
          },
          requestedQuantity
        });

        if (preview.warnings.length > 0) {
          setChainPreview(null);
          setChainComparisonMode("preview");
          setSelectedBlockTemplateId(null);
          setChainStatus("error");
          setChainStatusMessage(preview.warnings[0] ?? "추가 적재 계산에 실패했습니다. 결과를 다시 확인하세요.");
          return;
        }

        setChainPreview(preview);
        setChainComparisonMode("preview");
        setSelectedBlockTemplateId(preview.blockTemplateId);

        if (preview.addedQuantity > 0) {
          setChainStatus("preview");
          setChainStatusMessage(
            requestedQuantity
              ? `${preview.blockName} 요청 ${requestedQuantity}개 중 ${preview.addedQuantity}개 추가 가능`
              : `${preview.blockName} 최대 ${preview.addedQuantity}개 추가 가능`
          );
          return;
        }

        setChainStatus("empty");
        setChainStatusMessage(
          requestedQuantity
            ? `${preview.blockName}은 요청한 ${requestedQuantity}개를 더 넣을 수 없습니다.`
            : `${preview.blockName}은 현재 결과에 더 들어가지 않습니다.`
        );
      } catch {
        setChainPreview(null);
        setChainComparisonMode("preview");
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
    setChainComparisonMode("preview");
    setChainStatus("idle");
    setChainStatusMessage("추가 결과를 반영했습니다.");
  }

  function clearChainSelection() {
    setSelectedChainTemplateId(null);
    setChainPreview(null);
    setChainComparisonMode("preview");
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
          <div className="result-meta-strip" aria-label="결과 계산 정보">
            <span className="result-meta-item">
              계산 시각{" "}
              {latestResult ? (
                <time dateTime={latestResult.createdAt}>{formatDateTime(latestResult.createdAt)}</time>
              ) : (
                <span className="result-meta-value">결과를 만들면 계산 시각이 표시됩니다.</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="result-hero-grid">
        <SummaryTile label="사용 공간" value={latestResult ? `${latestResult.usedSpaceCount}개` : "-"} />
        <SummaryTile
          label="평균 적재율"
          value={latestResult ? `${Math.round(latestResult.averageUtilizationRate * 100)}%` : "-"}
        />
        <SummaryTile label="남은 부피" value={remainingVolumeLabel} />
        <SummaryTile label="미적재" value={latestResult ? `${latestResult.unloadedBlockCount}개` : "-"} />
        <SummaryTile label="대상 공간" value={resultSpace?.name ?? "미선택"} />
      </div>

      {resultCreating ? (
        <div className="result-calculation-progress" role="status" aria-live="polite">
          <strong>{resultCalculationProgress.statusLabel}</strong>
          <span>{resultCalculationProgress.description}</span>
        </div>
      ) : null}

      {resultFailure ? (
        <div className="result-failure-banner" role="alert" aria-label="계산 실패 안내">
          <div>
            <span className="badge" data-tone="red">
              계산 실패
            </span>
            <strong>{resultFailure.title}</strong>
            <p className="fine-print">{resultFailure.description}</p>
            <p className="fine-print">{resultFailure.actionHint}</p>
          </div>
          <div className="result-failure-actions">
            <button className="secondary-button" onClick={onEditInputs}>
              <PencilLine size={16} />
              입력 수정
            </button>
            <button
              className="primary-button"
              onClick={onCreateResult}
              disabled={resultActionCtaDisabled}
              title={resultActionCtaTitle}
            >
              <RotateCcw size={16} />
              {resultCreating ? resultCalculationProgress.buttonLabel : "다시 계산"}
            </button>
          </div>
        </div>
      ) : null}

      {latestResult && resultFreshnessState.visible ? (
        <div
          className="result-freshness-banner"
          data-tone={resultFreshnessState.tone}
          role="status"
          aria-label="입력이 바뀌었습니다"
        >
          <div>
            <span className="badge" data-tone="amber">
              재계산 필요
            </span>
            <strong>{resultFreshnessState.title}</strong>
            <p className="fine-print">{resultFreshnessState.description}</p>
            {resultFreshnessState.ctaDisabledReason ? (
              <p className="fine-print">{resultFreshnessState.ctaDisabledReason}</p>
            ) : null}
          </div>
          <button
            className="secondary-button"
            onClick={onCreateResult}
            disabled={resultCreating || resultFreshnessState.ctaDisabled}
            aria-label="결과 다시 만들기"
            title={resultCreating ? "결과를 계산하고 있습니다." : (resultFreshnessState.ctaDisabledReason ?? undefined)}
          >
            <Box size={16} />
            {resultCreating ? resultCalculationProgress.buttonLabel : resultFreshnessState.ctaLabel}
          </button>
        </div>
      ) : null}

      {unloadedWarningSummary.length > 0 ? (
        <div className="result-unloaded-callout" role="status" aria-label="미적재 안내">
          <div>
            <span className="badge" data-tone="amber">
              미적재 확인
            </span>
            <p className="fine-print">
              안전하게 올릴 자리가 없는 박스가 {latestResult?.unloadedBlockCount ?? 0}개 있습니다.
              박스 수량을 줄이거나 더 큰 공간을 선택하세요.
            </p>
          </div>
          <ul className="unloaded-warning-list">
            {unloadedWarningSummary.slice(0, 2).map((item) => (
              <li key={item.message}>
                {item.message}
                {item.count > 1 ? ` · ${item.count}건` : ""}
              </li>
            ))}
            {unloadedWarningSummary.length > 2 ? <li>외 {unloadedWarningSummary.length - 2}건</li> : null}
          </ul>
        </div>
      ) : null}

      {latestResult && needsExport ? (
        <div className="result-backup-callout" aria-label="결과 백업 안내">
          <div>
            <span className="badge" data-tone="amber">
              백업 권장
            </span>
            <p className="fine-print">
              결과를 다른 기기로 옮기거나 복구하려면 백업 파일을 만들어 두세요.
            </p>
          </div>
          <button className="primary-button result-backup-action" onClick={onExportJson}>
            <Download size={16} />
            백업 파일 만들기
          </button>
        </div>
      ) : null}

      {offsetRecommendation ? (
        <div className="offset-recommendation-card" role="status" aria-label={recommendationCopy?.ariaLabel}>
          <div className="offset-recommendation-copy">
            <span className="badge" data-tone="green">
              {recommendationCopy?.badge}
            </span>
            <strong>{recommendationCopy?.title}</strong>
            <p className="fine-print">{recommendationCopy?.description}</p>
            <div className="offset-recommendation-values" aria-label="추천 수치 비교">
              <span>
                {recommendationCopy?.currentValueLabel}
                <strong>{formatDimensions(offsetRecommendation.usableSizeBefore)}</strong>
              </span>
              <span>
                {recommendationCopy?.suggestedValueLabel}
                <strong>{formatDimensions(offsetRecommendation.usableSizeAfter)}</strong>
              </span>
            </div>
          </div>
          <div className="offset-recommendation-actions">
            <button className="secondary-button" onClick={onReviewSpaceOffset}>
              <PencilLine size={16} />
              {recommendationCopy?.reviewActionLabel}
            </button>
            <button
              className="secondary-button"
              aria-haspopup="dialog"
              aria-controls="offset-preview-dialog"
              onClick={(event) => openOffsetPreviewDialog(event.currentTarget)}
            >
              <Eye size={16} />
              추천 미리보기
            </button>
          </div>
        </div>
      ) : null}

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
                  <strong>{getResultViewTitle(resultViewMode)}</strong>
                  <span className="fine-print">
                    {resultSpace?.name ?? "공간 미선택"} · {usableSize ? formatDimensions(usableSize) : "-"}
                  </span>
                </div>
                <div className="view-buttons" aria-label="결과 보기 방식 선택">
                  {RESULT_VIEW_CONTROL_ITEMS.map((item) =>
                    item.id === "reset" ? (
                      <button
                        key={item.id}
                        className="secondary-button"
                        aria-label={item.ariaLabel}
                        onClick={() => selectResultViewControl(item.id)}
                      >
                        <RotateCcw size={16} />
                        {item.label}
                      </button>
                    ) : (
                      <button
                        key={item.id}
                        className="secondary-button"
                        aria-label={item.ariaLabel}
                        aria-pressed={resultViewMode === item.id}
                        onClick={() => selectResultViewControl(item.id)}
                      >
                        {item.label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {isChainComparisonActive ? (
                <div className="chain-preview-notice" data-mode={chainComparisonMode}>
                  <div className="chain-preview-copy">
                    <span className="badge" data-tone="green">
                      추가 결과 미리보기
                    </span>
                    <strong>
                      {chainPreview?.blockName ?? "선택 박스"} {chainPreview?.addedQuantity ?? 0}개 추가 화면
                    </strong>
                    <p className="fine-print" aria-live="polite">
                      현재 화면은 {chainComparisonMode === "preview" ? "추가 결과" : "원본"}입니다. 반영 전에는
                      버튼으로 원본과 추가 결과를 비교하세요.
                    </p>
                  </div>
                  <div className="chain-preview-actions" role="group" aria-label="추가 결과 비교">
                    <button
                      className="secondary-button"
                      aria-pressed={chainComparisonMode === "preview"}
                      onClick={() => setChainComparisonMode("preview")}
                    >
                      추가 결과 보기
                    </button>
                    <button
                      className="secondary-button"
                      aria-pressed={chainComparisonMode === "original"}
                      onClick={() => setChainComparisonMode("original")}
                    >
                      원본 보기
                    </button>
                    <button className="secondary-button chain-preview-cancel-action" onClick={clearChainSelection}>
                      미리보기 취소
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="projection-controls-stack">
                <div className="result-inspection-actions" aria-label="선택 공간 상세 확인">
                  <button
                    className="secondary-button"
                    aria-haspopup="dialog"
                    aria-controls="result-inspection-dialog"
                    disabled={!selectedPackedSpace}
                    title={selectedPackedSpace ? undefined : "확인할 공간 결과가 없습니다."}
                    onClick={(event) => openResultInspectionDialog("placement", event.currentTarget)}
                  >
                    <Box size={16} />
                    배치 상세
                  </button>
                  <button
                    className="secondary-button"
                    aria-haspopup="dialog"
                    aria-controls="result-inspection-dialog"
                    disabled={!selectedPackedSpace}
                    title={selectedPackedSpace ? undefined : "확인할 공간 결과가 없습니다."}
                    onClick={(event) => openResultInspectionDialog("stacking", event.currentTarget)}
                  >
                    <ListOrdered size={16} />
                    쌓는 순서
                  </button>
                </div>

                {resultViewMode === "three" && selectedPackedSpace && usableSize ? (
                  <div className="view-buttons three-camera-buttons" aria-label="3D 카메라 시점 선택">
                    {THREE_CAMERA_CONTROL_ITEMS.map((item) => (
                      <button
                        key={item.preset}
                        className="secondary-button"
                        aria-label={item.ariaLabel}
                        aria-pressed={threeCameraPreset === item.preset}
                        onClick={() => setThreeCameraPreset(item.preset)}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      className="secondary-button result-three-expand-button"
                      aria-haspopup="dialog"
                      aria-expanded={threeDialogOpen}
                      aria-controls="expanded-three-view-dialog"
                      onClick={(event) => openExpandedThreeView(event.currentTarget)}
                    >
                      <Maximize2 size={16} />
                      크게 보기
                    </button>
                  </div>
                ) : null}
              </div>

              {resultViewMode === "three" && selectedPackedSpace && usableSize ? (
                <>
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
                    fallbackAction={{
                      label: "위 보기로 확인",
                      ariaLabel: "3D 대신 위 보기로 결과 확인",
                      onClick: () => selectProjectionView("top")
                    }}
                  />
                  <ExpandedThreeViewDialog
                    open={threeDialogOpen}
                    blocks={selectedPackedSpace.blocks}
                    bounds={usableSize}
                    selectedBlockTemplateId={selectedBlockTemplateId}
                    chainPreviewBlockIds={chainPreviewBlockIds}
                    cameraPreset={threeCameraPreset}
                    resetToken={threeResetToken}
                    spaceLabel={`Space ${selectedPackedSpaceIndex + 1}`}
                    utilizationLabel={`적재율 ${Math.round(selectedPackedSpace.utilizationRate * 100)}%`}
                    spaceDescription={`${resultSpace?.name ?? "공간 미선택"} · ${formatDimensions(usableSize)}`}
                    onSelectCameraPreset={setThreeCameraPreset}
                    onResetViewer={resetResultViewer}
                    onSelectBlockTemplate={toggleSelectedBlockTemplate}
                    onClearSelection={clearSelectedBlockTemplate}
                    onOpenFallbackView={openTopFallbackFromExpanded}
                    onClose={closeExpandedThreeView}
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
                    {selectedLegendItem ? (
                      <button className="secondary-button selection-clear-action" onClick={clearSelectedBlockTemplate}>
                        <X size={16} />
                        강조 해제
                      </button>
                    ) : null}
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
          <ResultInspectionDialog
            openKind={resultInspectionDialog}
            spaceLabel={stackingInstructionSpaceLabel}
            placementDetailRows={placementDetailRows}
            stackingInstructionSteps={stackingInstructionSteps}
            stackingLayerSummaries={stackingLayerSummaries}
            instructionCopyStatus={instructionCopyStatus}
            instructionDownloadStatus={instructionDownloadStatus}
            instructionDownloadFilename={instructionDownloadFilename}
            hasLatestResult={Boolean(latestResult)}
            hasSelectedSpace={Boolean(selectedPackedSpace)}
            stackingInstructionText={stackingInstructionText}
            onCopyStackingInstructions={copyStackingInstructions}
            onDownloadStackingInstructions={downloadStackingInstructions}
            onClose={closeResultInspectionDialog}
          />
          <OffsetRecommendationPreviewDialog
            open={offsetPreviewDialogOpen && Boolean(offsetRecommendation)}
            recommendation={offsetRecommendation}
            resultSpace={resultSpace ?? null}
            onClose={closeOffsetPreviewDialog}
          />
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
                    <button
                      className="primary-button result-empty-action"
                      onClick={onCreateResult}
                      disabled={resultCreating}
                      aria-label={resultCreating ? "결과 대기 화면에서 결과 계산 중" : "결과 대기 화면에서 결과 만들기"}
                      aria-live="polite"
                    >
                      <Box size={16} />
                      {resultCreating ? resultCalculationProgress.buttonLabel : "결과 만들기"}
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
        requestedQuantity={chainRequestedQuantity}
        preview={chainPreview}
        chainHistory={latestResultChainHistory}
        latestChainItem={latestChainItem}
        resultCreating={resultCreating}
        resultCalculationProgress={resultCalculationProgress}
        onSelectTemplate={selectChainTemplate}
        onCalculate={calculateChainPreview}
        onCalculateRequested={calculateRequestedChainPreview}
        onRequestedQuantityChange={changeChainRequestedQuantity}
        onConfirm={confirmChainPreview}
        onCreateResult={onCreateResult}
        onClearSelection={clearChainSelection}
        onUndo={() => {
          if (latestResult) {
            onUndoLastChainAddition(latestResult.resultId);
            setChainPreview(null);
            setChainComparisonMode("preview");
            setSelectedBlockTemplateId(null);
            setChainStatus("idle");
            setChainStatusMessage("직전 추가를 취소했습니다.");
          }
        }}
      />

      <div className="result-lower-grid">
        <section className="sub-panel result-action-panel">
          <h3>결과 작업</h3>
          <p className="meta">{resultActionDescription}</p>
          <div className="result-action-buttons">
            <button className="secondary-button result-edit-input-action" onClick={onEditInputs}>
              <PencilLine size={16} />
              입력 수정
            </button>
            <button
              className="primary-button result-recalculate-action"
              onClick={onCreateResult}
              disabled={resultActionCtaDisabled}
              title={resultActionCtaTitle}
              aria-label={latestResult ? "현재 입력으로 다시 계산" : "결과 작업에서 결과 만들기"}
            >
              <RotateCcw size={16} />
              {resultCreating ? resultCalculationProgress.buttonLabel : resultActionCtaLabel}
            </button>
          </div>
          {resultFreshnessState.ctaDisabledReason ? (
            <p className="fine-print review-cta-hint">{resultFreshnessState.ctaDisabledReason}</p>
          ) : null}
        </section>
        <section className="sub-panel field-handoff-panel" data-tone={fieldHandoffChecklist.tone}>
          <h3>현장 전달 전 점검</h3>
          <p className="meta">{fieldHandoffChecklist.description}</p>
          <ul className="field-handoff-list">
            {fieldHandoffChecklist.items.map((item) => (
              <li key={item.id} className="field-handoff-item" data-status={item.status}>
                {item.status === "ready" ? (
                  <CheckCircle2 size={18} color="var(--green)" />
                ) : item.status === "attention" ? (
                  <AlertTriangle size={18} color="var(--amber)" />
                ) : (
                  <ListOrdered size={18} color="var(--muted)" />
                )}
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </li>
            ))}
          </ul>
          {fieldHandoffChecklist.items.some((item) => item.action) ? (
            <div className="field-handoff-actions">
              {fieldHandoffChecklist.items
                .filter((item) => item.action)
                .map((item) => (
                  <button
                    key={item.id}
                    className={
                      item.action === "export-backup"
                        ? "primary-button field-handoff-action"
                        : "secondary-button field-handoff-action"
                    }
                    onClick={(event) => {
                      if (item.action) {
                        handleFieldHandoffAction(item.action, event);
                      }
                    }}
                    disabled={item.action ? isFieldHandoffActionDisabled(item.action) : false}
                    title={
                      item.action === "create-result" || item.action === "recalculate"
                        ? resultActionCtaTitle
                        : undefined
                    }
                  >
                    {item.action === "export-backup" ? (
                      <Download size={16} />
                    ) : item.action === "open-instructions" ? (
                      <ListOrdered size={16} />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                    {item.actionLabel}
                  </button>
                ))}
            </div>
          ) : null}
        </section>
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
          {resultWarningSummary.length ? (
            <ul className="checklist compact-checklist">
              {resultWarningSummary.map((warning) => (
                <li key={warning.message} className="review-message" data-tone="amber">
                  <AlertTriangle size={18} color="var(--amber)" />
                  {warning.message}
                  {warning.count > 1 ? ` · ${warning.count}건` : ""}
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

function ResultInspectionDialog({
  openKind,
  spaceLabel,
  placementDetailRows,
  stackingInstructionSteps,
  stackingLayerSummaries,
  instructionCopyStatus,
  instructionDownloadStatus,
  instructionDownloadFilename,
  hasLatestResult,
  hasSelectedSpace,
  stackingInstructionText,
  onCopyStackingInstructions,
  onDownloadStackingInstructions,
  onClose
}: {
  openKind: ResultInspectionDialogKind | null;
  spaceLabel: string;
  placementDetailRows: ReturnType<typeof createPlacementDetailRows>;
  stackingInstructionSteps: ReturnType<typeof createStackingInstructionSteps>;
  stackingLayerSummaries: ReturnType<typeof createStackingLayerSummaries>;
  instructionCopyStatus: InstructionCopyStatus;
  instructionDownloadStatus: InstructionDownloadStatus;
  instructionDownloadFilename: string | null;
  hasLatestResult: boolean;
  hasSelectedSpace: boolean;
  stackingInstructionText: string;
  onCopyStackingInstructions: () => void;
  onDownloadStackingInstructions: () => void;
  onClose: (options?: { restoreFocus?: boolean }) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "result-inspection-dialog-title";
  const descriptionId = "result-inspection-dialog-description";
  const isPlacement = openKind === "placement";
  const title = isPlacement ? "배치 상세" : "쌓는 순서";
  const description = isPlacement
    ? `선택한 ${spaceLabel} 기준 · 박스별 위치와 회전 후 크기`
    : `선택한 ${spaceLabel} 기준 · 아래층부터 확인`;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (openKind) {
      if (!dialog.open) {
        dialog.showModal();
      }

      window.setTimeout(() => {
        dialog.querySelector<HTMLButtonElement>("[data-result-inspection-close='true']")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [openKind]);

  return (
    <dialog
      id="result-inspection-dialog"
      ref={dialogRef}
      className="result-inspection-dialog"
      aria-modal="true"
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
      <div className="result-inspection-dialog-sheet">
        <div className="space-form-dialog-head result-inspection-dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId} className="fine-print">
              {hasLatestResult && hasSelectedSpace
                ? description
                : "결과를 만들면 선택 공간의 상세 정보를 확인할 수 있습니다."}
            </p>
          </div>
          <button
            className="icon-button panel-close-button"
            data-result-inspection-close="true"
            onClick={() => onClose()}
            aria-label={`${title} 닫기`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="result-inspection-dialog-body">
          {isPlacement ? (
            <PlacementDetailContent
              titleId={titleId}
              rows={placementDetailRows}
              hasLatestResult={hasLatestResult}
              hasSelectedSpace={hasSelectedSpace}
            />
          ) : (
            <StackingOrderContent
              steps={stackingInstructionSteps}
              layers={stackingLayerSummaries}
              instructionCopyStatus={instructionCopyStatus}
              instructionDownloadStatus={instructionDownloadStatus}
              instructionDownloadFilename={instructionDownloadFilename}
              hasLatestResult={hasLatestResult}
              hasSelectedSpace={hasSelectedSpace}
              stackingInstructionText={stackingInstructionText}
              onCopyStackingInstructions={onCopyStackingInstructions}
              onDownloadStackingInstructions={onDownloadStackingInstructions}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

function createResultSpaceRecommendationCopy(recommendation: ResultSpaceAdjustmentRecommendation) {
  if (recommendation.kind === "overhang-pallet") {
    const improvedUnloaded = recommendation.improvedUnloadedBlockCount < recommendation.originalUnloadedBlockCount;
    const improvementText = improvedUnloaded
      ? `현재 미적재 ${recommendation.originalUnloadedBlockCount}개가 있지만, 오버행 파레트로 검토하면 미적재를 ${recommendation.improvedUnloadedBlockCount}개까지 줄일 수 있습니다.`
      : `현재 ${recommendation.originalUsedSpaceCount}개 공간이 필요하지만, 오버행 파레트로 검토하면 ${recommendation.improvedUsedSpaceCount}개 공간으로 줄어들 수 있습니다.`;

    return {
      ariaLabel: "오버행 파레트 검토 추천",
      badge: "오버행 파레트 검토",
      title: "오버행 파레트로 다시 계산하면 공간 사용을 줄일 가능성이 있습니다.",
      description: `${improvementText} 자동으로 바꾸지 않습니다. 현장 책임자 확인 후 오버행 파레트를 선택해 다시 계산하세요.`,
      currentValueLabel: recommendation.originalSpace.name,
      suggestedValueLabel: recommendation.suggestedSpace.name,
      reviewActionLabel: "공간 선택 확인",
      previewDescription:
        "실제 공간 선택은 아직 바뀌지 않았습니다. 현장 책임자 확인 후 오버행 파레트를 선택해 다시 계산하세요."
    };
  }

  return {
    ariaLabel: "안전 여유 조정 추천",
    badge: "안전 여유 조정 추천",
    title: `안전 여유를 최대 ${recommendation.reductionMm}mm 검토하면 공간을 더 적게 쓸 가능성이 있습니다.`,
    description: `현재 ${recommendation.originalUsedSpaceCount}개 공간이 필요하지만, 현장 책임자 확인 후 안전 여유를 조정하면 ${recommendation.improvedUsedSpaceCount}개 공간으로 줄어들 수 있습니다.`,
    currentValueLabel: "현재 적재 가능",
    suggestedValueLabel: "추천 검토값",
    reviewActionLabel: "공간 설정 확인",
    previewDescription: "실제 공간 설정은 아직 바뀌지 않았습니다. 현장 책임자 확인 후 공간 설정에서 직접 수정하세요."
  };
}

function OffsetRecommendationPreviewDialog({
  open,
  recommendation,
  resultSpace,
  onClose
}: {
  open: boolean;
  recommendation: ResultSpaceAdjustmentRecommendation | null;
  resultSpace: SpaceDefinition | null;
  onClose: (options?: { restoreFocus?: boolean }) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "offset-preview-dialog-title";
  const descriptionId = "offset-preview-dialog-description";
  const [selectedPreviewSpaceId, setSelectedPreviewSpaceId] = useState<string | null>(null);
  const [selectedBlockTemplateId, setSelectedBlockTemplateId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<ThreeCameraPreset>("isometric");
  const [resetToken, setResetToken] = useState(0);
  const previewSpaces = recommendation?.previewSpaces ?? [];
  const recommendationCopy = recommendation ? createResultSpaceRecommendationCopy(recommendation) : null;
  const selectedPreviewSpace =
    previewSpaces.find((space) => space.spaceInstanceId === selectedPreviewSpaceId) ?? previewSpaces[0] ?? null;
  const selectedPreviewSpaceIndex = selectedPreviewSpace
    ? Math.max(
        0,
        previewSpaces.findIndex((space) => space.spaceInstanceId === selectedPreviewSpace.spaceInstanceId)
      )
    : -1;
  const previewSpaceSummaries = useMemo(
    () => new Map(previewSpaces.map((space) => [space.spaceInstanceId, createPackedSpaceLoadSummary(space)] as const)),
    [previewSpaces]
  );
  const emptyPreviewBlockIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    if (!open || !recommendation) {
      return;
    }

    setSelectedPreviewSpaceId(recommendation.previewSpaces[0]?.spaceInstanceId ?? null);
    setSelectedBlockTemplateId(null);
    setCameraPreset("isometric");
    setResetToken((value) => value + 1);
  }, [open, recommendation]);

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
        dialog.querySelector<HTMLButtonElement>("[data-offset-preview-close='true']")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function toggleSelectedPreviewBlock(blockTemplateId: string) {
    setSelectedBlockTemplateId((current) => (current === blockTemplateId ? null : blockTemplateId));
  }

  function resetPreviewViewer() {
    setCameraPreset("isometric");
    setResetToken((value) => value + 1);
    setSelectedBlockTemplateId(null);
  }

  return (
    <dialog
      id="offset-preview-dialog"
      ref={dialogRef}
      className="offset-preview-dialog"
      aria-modal="true"
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
      <div className="offset-preview-dialog-sheet">
        <div className="space-form-dialog-head offset-preview-dialog-head">
          <div>
            <h2 id={titleId}>추천 적용 미리보기</h2>
            <p id={descriptionId} className="fine-print">
              {recommendationCopy?.previewDescription ??
                "실제 공간 설정은 아직 바뀌지 않았습니다. 현장 책임자 확인 후 공간 설정에서 직접 수정하세요."}
            </p>
          </div>
          <button
            className="icon-button panel-close-button"
            data-offset-preview-close="true"
            onClick={() => onClose()}
            aria-label="추천 적용 미리보기 닫기"
          >
            <X size={16} />
          </button>
        </div>

        {recommendation ? (
          <>
            <div className="offset-preview-summary" aria-label="추천 미리보기 요약">
              <span>
                현재 공간 수
                <strong>{recommendation.originalUsedSpaceCount}개</strong>
              </span>
              <span>
                추천 후 공간 수
                <strong>{recommendation.improvedUsedSpaceCount}개</strong>
              </span>
              <span>
                현재 안전 여유
                <strong>{formatRecommendationCurrentSetting(recommendation)}</strong>
              </span>
              <span>
                추천 검토값
                <strong>{formatRecommendationSuggestedSetting(recommendation)}</strong>
              </span>
            </div>

            <div className="offset-preview-dialog-body">
              <aside className="offset-preview-space-list" aria-label="추천값 기준 공간 선택">
                <strong>추천값 기준 3D 보기</strong>
                <span className="fine-print">
                  {recommendation.kind === "overhang-pallet"
                    ? recommendation.suggestedSpace.name
                    : (resultSpace?.name ?? "선택 공간")}{" "}
                  · {formatDimensions(recommendation.usableSizeAfter)}
                </span>
                <div className="space-instance-list">
                  {previewSpaces.map((space, index) => (
                    <button
                      key={space.spaceInstanceId}
                      className="space-instance-button"
                      aria-pressed={space.spaceInstanceId === selectedPreviewSpace?.spaceInstanceId}
                      onClick={() => {
                        setSelectedPreviewSpaceId(space.spaceInstanceId);
                        setSelectedBlockTemplateId(null);
                      }}
                    >
                      <strong>Space {index + 1}</strong>
                      <span>
                        {space.blocks.length}개 · {Math.round(space.utilizationRate * 100)}%
                      </span>
                      <small className="space-load-summary">
                        {previewSpaceSummaries.get(space.spaceInstanceId) ?? "적재 박스 없음"}
                      </small>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="offset-preview-stage" aria-label="추천값 기준 3D 결과">
                <div className="projection-toolbar">
                  <div>
                    <strong>
                      {selectedPreviewSpace ? `Space ${selectedPreviewSpaceIndex + 1}` : "미리보기 없음"}
                    </strong>
                    <span className="fine-print">
                      추천 적재 가능 {formatDimensions(recommendation.usableSizeAfter)}
                    </span>
                  </div>
                  <div className="view-buttons three-camera-buttons" aria-label="추천 미리보기 카메라 시점 선택">
                    {THREE_CAMERA_CONTROL_ITEMS.map((item) => (
                      <button
                        key={item.preset}
                        className="secondary-button"
                        aria-label={`추천 미리보기 ${item.ariaLabel}`}
                        aria-pressed={cameraPreset === item.preset}
                        onClick={() => setCameraPreset(item.preset)}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button className="secondary-button" onClick={resetPreviewViewer} aria-label="추천 미리보기 처음 보기">
                      <RotateCcw size={16} />
                      처음
                    </button>
                  </div>
                </div>

                {selectedPreviewSpace ? (
                  <Result3DCanvas
                    blocks={selectedPreviewSpace.blocks}
                    bounds={recommendation.usableSizeAfter}
                    selectedBlockTemplateId={selectedBlockTemplateId}
                    chainPreviewBlockIds={emptyPreviewBlockIds}
                    cameraPreset={cameraPreset}
                    resetToken={resetToken}
                    spaceLabel={`추천 Space ${selectedPreviewSpaceIndex + 1}`}
                    utilizationLabel={`적재율 ${Math.round(selectedPreviewSpace.utilizationRate * 100)}%`}
                    onSelectBlockTemplate={toggleSelectedPreviewBlock}
                    onClearSelection={() => setSelectedBlockTemplateId(null)}
                  />
                ) : (
                  <p className="meta">추천 미리보기로 표시할 공간 결과가 없습니다.</p>
                )}
              </section>
            </div>
          </>
        ) : (
          <p className="meta">추천 결과가 있을 때 미리보기를 확인할 수 있습니다.</p>
        )}
      </div>
    </dialog>
  );
}

function formatRecommendationCurrentSetting(recommendation: ResultSpaceAdjustmentRecommendation) {
  return recommendation.kind === "overhang-pallet"
    ? recommendation.originalSpace.name
    : formatOffset(recommendation.originalOffset);
}

function formatRecommendationSuggestedSetting(recommendation: ResultSpaceAdjustmentRecommendation) {
  return recommendation.kind === "overhang-pallet"
    ? recommendation.suggestedSpace.name
    : formatOffset(recommendation.suggestedOffset);
}

function formatOffset(offset: { widthMm: number; depthMm: number; heightMm: number }) {
  return `${offset.widthMm} / ${offset.depthMm} / ${offset.heightMm}mm`;
}

function PlacementDetailContent({
  titleId,
  rows,
  hasLatestResult,
  hasSelectedSpace
}: {
  titleId: string;
  rows: ReturnType<typeof createPlacementDetailRows>;
  hasLatestResult: boolean;
  hasSelectedSpace: boolean;
}) {
  if (rows.length > 0) {
    return (
      <div className="placement-detail-table" role="table" aria-labelledby={titleId}>
        <div className="placement-detail-header" role="row">
          <span role="columnheader">순서</span>
          <span role="columnheader">박스</span>
          <span role="columnheader">위치</span>
          <span role="columnheader">회전 후 크기</span>
          <span role="columnheader">방향</span>
        </div>
        {rows.map((row) => (
          <div key={row.blockId} className="placement-detail-row" role="row">
            <span role="cell" data-label="순서">
              <strong>{row.sequenceLabel}</strong>
            </span>
            <span role="cell" data-label="박스">
              <strong>{row.name}</strong>
              <small>{row.handlingLabel}</small>
            </span>
            <span role="cell" data-label="위치">
              {row.positionLabel}
            </span>
            <span role="cell" data-label="회전 후 크기">
              {row.sizeLabel}
            </span>
            <span role="cell" data-label="방향">
              {row.directionLabel}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (hasLatestResult && hasSelectedSpace) {
    return <p className="meta">선택한 공간에 표시할 배치 좌표가 없습니다.</p>;
  }

  return <p className="meta">결과를 만들면 배치 상세표가 표시됩니다.</p>;
}

function StackingOrderContent({
  steps,
  layers,
  instructionCopyStatus,
  instructionDownloadStatus,
  instructionDownloadFilename,
  hasLatestResult,
  hasSelectedSpace,
  stackingInstructionText,
  onCopyStackingInstructions,
  onDownloadStackingInstructions
}: {
  steps: ReturnType<typeof createStackingInstructionSteps>;
  layers: ReturnType<typeof createStackingLayerSummaries>;
  instructionCopyStatus: InstructionCopyStatus;
  instructionDownloadStatus: InstructionDownloadStatus;
  instructionDownloadFilename: string | null;
  hasLatestResult: boolean;
  hasSelectedSpace: boolean;
  stackingInstructionText: string;
  onCopyStackingInstructions: () => void;
  onDownloadStackingInstructions: () => void;
}) {
  return (
    <>
      <div className="loading-instruction-actions">
        <button
          className="secondary-button loading-instruction-copy-button"
          onClick={onCopyStackingInstructions}
          disabled={!stackingInstructionText}
          title={stackingInstructionText ? undefined : "복사할 작업 순서가 없습니다."}
        >
          <Copy size={16} />
          작업 순서 복사
        </button>
        <button
          className="secondary-button loading-instruction-download-button"
          onClick={onDownloadStackingInstructions}
          disabled={!stackingInstructionText}
          title={stackingInstructionText ? undefined : "저장할 작업 지시서가 없습니다."}
        >
          <Download size={16} />
          작업 지시서 저장
        </button>
      </div>
      {instructionCopyStatus === "copied" ? (
        <p className="loading-instruction-copy-status" data-tone="green" role="status">
          작업 순서를 복사했습니다.
        </p>
      ) : instructionCopyStatus === "error" ? (
        <p className="loading-instruction-copy-status" data-tone="amber" role="status">
          복사하지 못했습니다. 브라우저 권한을 확인하세요.
        </p>
      ) : null}
      {instructionDownloadStatus === "downloaded" ? (
        <p className="loading-instruction-copy-status" data-tone="green" role="status">
          {createStackingInstructionDownloadSuccessMessage(instructionDownloadFilename ?? "작업 지시서.txt")}
        </p>
      ) : instructionDownloadStatus === "error" ? (
        <p className="loading-instruction-copy-status" data-tone="amber" role="status">
          작업 지시서 파일을 만들지 못했습니다. 브라우저 다운로드 설정을 확인하세요.
        </p>
      ) : null}
      {steps.length > 0 ? (
        <>
          <div className="loading-instruction-list" aria-label="현장 작업 순서">
            {steps.map((step) => (
              <div key={`${step.stepIndex}-${step.title}`} className="loading-instruction-row">
                <strong>{step.title}</strong>
                <div className="loading-instruction-copy">
                  <p>{step.instruction}</p>
                  <small>{step.detail}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="stacking-layer-list" aria-label="층별 적재 순서">
            {layers.map((layer) => (
              <div key={`${layer.zMm}-${layer.layerIndex}`} className="stacking-layer-row">
                <strong>{layer.layerIndex}층</strong>
                <span>
                  {layer.heightLabel}
                  <small>{layer.loadSummary}</small>
                </span>
                <small className="stacking-layer-count">총 {layer.blockCount}개</small>
              </div>
            ))}
          </div>
        </>
      ) : hasLatestResult && hasSelectedSpace ? (
        <p className="meta">선택한 공간에 적재된 박스가 없습니다.</p>
      ) : (
        <p className="meta">결과를 만들면 선택 공간의 층별 적재 순서가 표시됩니다.</p>
      )}
    </>
  );
}

function ExpandedThreeViewDialog({
  open,
  blocks,
  bounds,
  selectedBlockTemplateId,
  chainPreviewBlockIds,
  cameraPreset,
  resetToken,
  spaceLabel,
  utilizationLabel,
  spaceDescription,
  onSelectCameraPreset,
  onResetViewer,
  onSelectBlockTemplate,
  onClearSelection,
  onOpenFallbackView,
  onClose
}: {
  open: boolean;
  blocks: PackedBlock[];
  bounds: NonNullable<ReturnType<typeof calculateUsableSize>>;
  selectedBlockTemplateId: string | null;
  chainPreviewBlockIds: Set<string>;
  cameraPreset: ThreeCameraPreset;
  resetToken: number;
  spaceLabel: string;
  utilizationLabel: string;
  spaceDescription: string;
  onSelectCameraPreset: (preset: ThreeCameraPreset) => void;
  onResetViewer: () => void;
  onSelectBlockTemplate: (blockTemplateId: string) => void;
  onClearSelection: () => void;
  onOpenFallbackView: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "expanded-three-view-dialog-title";
  const descriptionId = "expanded-three-view-dialog-description";

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
        dialog.querySelector<HTMLButtonElement>("[data-expanded-close='true']")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="expanded-three-view-dialog"
      ref={dialogRef}
      className="result-three-dialog"
      aria-modal="true"
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
      <div className="result-three-dialog-sheet">
        <div className="space-form-dialog-head result-three-dialog-head">
          <div>
            <h2 id={titleId}>3D 크게 보기</h2>
            <p id={descriptionId} className="fine-print">
              {spaceLabel} · {spaceDescription} · {utilizationLabel}
            </p>
          </div>
          <button
            className="icon-button panel-close-button"
            data-expanded-close="true"
            onClick={onClose}
            aria-label="3D 크게 보기 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="view-buttons three-camera-buttons expanded-three-camera-buttons" aria-label="확대 3D 카메라 시점 선택">
          {THREE_CAMERA_CONTROL_ITEMS.map((item) => (
            <button
              key={item.preset}
              className="secondary-button"
              aria-label={`확대 ${item.ariaLabel}`}
              aria-pressed={cameraPreset === item.preset}
              onClick={() => onSelectCameraPreset(item.preset)}
            >
              {item.label}
            </button>
          ))}
          <button className="secondary-button" onClick={onResetViewer} aria-label="확대 3D 처음 보기로 되돌리기">
            <RotateCcw size={16} />
            처음
          </button>
        </div>

        <div className="result-three-dialog-body">
          {open ? (
            <Result3DCanvas
              blocks={blocks}
              bounds={bounds}
              selectedBlockTemplateId={selectedBlockTemplateId}
              chainPreviewBlockIds={chainPreviewBlockIds}
              cameraPreset={cameraPreset}
              resetToken={resetToken}
              spaceLabel={spaceLabel}
              utilizationLabel={utilizationLabel}
              onSelectBlockTemplate={onSelectBlockTemplate}
              onClearSelection={onClearSelection}
              fallbackAction={{
                label: "위 보기로 확인",
                ariaLabel: "확대 3D 대신 위 보기로 결과 확인",
                onClick: () => {
                  onOpenFallbackView();
                }
              }}
            />
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

function ChainSimulationPanel({
  latestResult,
  blockOptions,
  selectedTemplateId,
  chainStatus,
  statusMessage,
  requestedQuantity,
  preview,
  chainHistory,
  latestChainItem,
  resultCreating,
  resultCalculationProgress,
  onSelectTemplate,
  onCalculate,
  onCalculateRequested,
  onRequestedQuantityChange,
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
  requestedQuantity: number;
  preview: ChainSimulationOutput | null;
  chainHistory: ChainHistoryItem[];
  latestChainItem: ChainHistoryItem | null;
  resultCreating: boolean;
  resultCalculationProgress: ResultCalculationProgressCopy;
  onSelectTemplate: (blockTemplateId: string) => void;
  onCalculate: () => void;
  onCalculateRequested: () => void;
  onRequestedQuantityChange: (quantity: number) => void;
  onConfirm: () => void;
  onCreateResult: () => void;
  onClearSelection: () => void;
  onUndo: () => void;
}) {
  const hasResult = Boolean(latestResult);
  const canCalculate = hasResult && Boolean(selectedTemplateId) && chainStatus !== "calculating";
  const canCalculateRequested = canCalculate && requestedQuantity >= 1;
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

            <div className="chain-quantity-control">
              <label className="chain-quantity-field">
                원하는 추가 수량(개)
                <NumberFieldInput
                  aria-label="추가할 수량"
                  min={1}
                  value={requestedQuantity}
                  onValidValueChange={onRequestedQuantityChange}
                />
              </label>
              <button className="secondary-button" onClick={onCalculateRequested} disabled={!canCalculateRequested}>
                지정 수량 계산
              </button>
            </div>

            <div className="form-actions chain-actions">
              <button className="primary-button" onClick={onCalculate} disabled={!canCalculate}>
                {chainStatus === "calculating"
                  ? "추가 가능 수량 계산 중..."
                  : chainStatus === "error"
                    ? "다시 계산"
                    : "최대 적재 계산"}
              </button>
              <button className="primary-button" onClick={onConfirm} disabled={!canConfirm}>
                이 결과 반영
              </button>
              {chainStatus === "error" ? (
                <button className="secondary-button" onClick={onCreateResult} disabled={resultCreating}>
                  {resultCreating ? resultCalculationProgress.buttonLabel : "결과 다시 생성"}
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
  connectivityStatus,
  pwaOfflineStatus,
  pwaInstallStatus,
  persistenceRequestResult,
  persistenceRequesting,
  onClose,
  onExportJson,
  onReloadLatestWorkspace,
  onRequestStorageProtection,
  onInstallPwa
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
  connectivityStatus: ConnectivityStatus;
  pwaOfflineStatus: PwaOfflineReadinessStatus;
  pwaInstallStatus: PwaInstallStatus;
  persistenceRequestResult: PersistenceRequestResult | null;
  persistenceRequesting: boolean;
  onClose: () => void;
  onExportJson: () => void;
  onReloadLatestWorkspace: () => void;
  onRequestStorageProtection: () => void;
  onInstallPwa: () => void;
}) {
  const localState = createLocalSaveState({
    status,
    error,
    lastLocalSavedLabel: lastLocalSavedAt ? formatDateTime(lastLocalSavedAt) : null,
    saveConflict,
    otherTabCount
  });
  const exportState = getExportState(workspace, needsExport);
  const browserState = getBrowserProtectionState(storageHealth, persistenceRequestResult);
  const pwaOfflineState = getPwaOfflineReadinessCopy(pwaOfflineStatus);
  const pwaInstallState = getPwaInstallGuidanceCopy(pwaInstallStatus);
  const canRequestProtection =
    Boolean(storageHealth?.persistSupported) && storageHealth?.persistenceState !== "persisted" && !persistenceRequesting;
  const pwaInstallActionBusy = pwaInstallStatus === "prompting" || pwaInstallStatus === "accepted";
  const pwaInstallActionDone = pwaInstallStatus === "installed";
  const canUsePwaInstallAction = !pwaInstallActionBusy && !pwaInstallActionDone;

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
          detail={localState.detail}
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
        <StorageHealthRow
          icon={<WifiOff size={18} />}
          tone={pwaOfflineState.tone}
          label="오프라인 준비"
          value={pwaOfflineState.value}
          description={pwaOfflineState.description}
          detail={pwaOfflineState.detail}
        />
        <StorageHealthRow
          icon={<Smartphone size={18} />}
          tone={pwaInstallState.tone}
          label="앱 설치"
          value={pwaInstallState.value}
          description={pwaInstallState.description}
          detail={pwaInstallState.detail}
        />
        {connectivityStatus.visible ? (
          <StorageHealthRow
            icon={<WifiOff size={18} />}
            tone={connectivityStatus.tone}
            label="네트워크 상태"
            value={connectivityStatus.title}
            description={connectivityStatus.description}
            detail="네트워크 상태는 브라우저가 감지한 힌트입니다. 작업 차단 기준으로 사용하지 않습니다."
          />
        ) : null}
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
        <button
          className="secondary-button"
          onClick={onInstallPwa}
          disabled={!canUsePwaInstallAction}
          title={pwaInstallStatus === "installed" ? "이미 앱처럼 열 수 있는 상태입니다." : undefined}
        >
          <Smartphone size={16} />
          {getPwaInstallActionLabel(pwaInstallStatus)}
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
    <div className="space-form-rows space-form">
      <div className="form-row space-form-name-row">
        <label>
          공간명
          <input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
        </label>
      </div>
      <div className="form-row form-row-three space-form-dimension-row">
        <label>
          가로(mm)
          <NumberFieldInput
            aria-label="공간 가로 mm"
            min={1}
            value={value.widthMm}
            onValidValueChange={(widthMm) => onChange({ ...value, widthMm })}
          />
        </label>
        <label>
          세로(mm)
          <NumberFieldInput
            aria-label="공간 세로 mm"
            min={1}
            value={value.depthMm}
            onValidValueChange={(depthMm) => onChange({ ...value, depthMm })}
          />
        </label>
        <label>
          높이(mm)
          <NumberFieldInput
            aria-label="공간 높이 mm"
            min={1}
            value={value.heightMm}
            onValidValueChange={(heightMm) => onChange({ ...value, heightMm })}
          />
        </label>
      </div>
      <div className="form-row form-row-three space-form-offset-row">
        <label>
          안전 여유 가로(mm)
          <NumberFieldInput
            aria-label="안전 여유 가로 mm"
            min={0}
            value={value.offsetWidthMm}
            onValidValueChange={(offsetWidthMm) => onChange({ ...value, offsetWidthMm })}
          />
        </label>
        <label>
          안전 여유 세로(mm)
          <NumberFieldInput
            aria-label="안전 여유 세로 mm"
            min={0}
            value={value.offsetDepthMm}
            onValidValueChange={(offsetDepthMm) => onChange({ ...value, offsetDepthMm })}
          />
        </label>
        <label>
          안전 여유 높이(mm)
          <NumberFieldInput
            aria-label="안전 여유 높이 mm"
            min={0}
            value={value.offsetHeightMm}
            onValidValueChange={(offsetHeightMm) => onChange({ ...value, offsetHeightMm })}
          />
        </label>
      </div>
    </div>
  );
}

function NumberFieldInput({
  value,
  min,
  onValidValueChange,
  "aria-label": ariaLabel
}: {
  value: number;
  min: number;
  onValidValueChange: (value: number) => void;
  "aria-label": string;
}) {
  const errorId = useId();
  const [draftValue, setDraftValue] = useState(() => formatNumberFieldDraftValue(value));
  const [error, setError] = useState<string | null>(() => getCommittedNumberFieldError(value, min));

  useEffect(() => {
    setDraftValue(formatNumberFieldDraftValue(value));
    setError(getCommittedNumberFieldError(value, min));
  }, [min, value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraftValue = event.target.value;
    setDraftValue(nextDraftValue);

    const result = parseFieldIntegerInput(nextDraftValue, { min });

    if (result.status !== "valid") {
      setError(result.message);
      return;
    }

    setError(null);
    onValidValueChange(result.value);
  };

  const handleBlur = () => {
    const result = parseFieldIntegerInput(draftValue, { min });

    if (result.status !== "valid") {
      setDraftValue(formatNumberFieldDraftValue(value));
      setError(getCommittedNumberFieldError(value, min));
      return;
    }

    setDraftValue(String(result.value));
    setError(null);
    onValidValueChange(result.value);
  };

  return (
    <>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        inputMode="numeric"
        type="number"
        min={min}
        step="1"
        value={draftValue}
        onBlur={handleBlur}
        onClick={selectNumberFieldValue}
        onFocus={selectNumberFieldValue}
        onChange={handleChange}
      />
      {error ? (
        <span className="field-error" id={errorId} role="status">
          {error}
        </span>
      ) : null}
    </>
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
  const importConflictCopy = getImportConflictCopy(pendingImport.conflict);

  return (
    <div className="import-panel" role="alert">
      <strong>{importConflictCopy.title}</strong>
      <p className="fine-print">{importConflictCopy.description}</p>
      <p className="fine-print">{importConflictCopy.backupHint}</p>
      <div className="form-actions import-conflict-actions">
        <button className="secondary-button" onClick={onExportJson}>
          <Download size={16} />
          현재 작업 먼저 백업
        </button>
        {pendingImport.conflict.options.includes("keep-current") ? (
          <button className="secondary-button" onClick={() => onResolve("keep-current")}>
            {importConflictCopy.actionLabels.keepCurrent}
          </button>
        ) : null}
        {pendingImport.conflict.options.includes("replace") ? (
          <button className="primary-button" onClick={() => onResolve("replace")}>
            {importConflictCopy.actionLabels.replace}
          </button>
        ) : null}
        {pendingImport.conflict.options.includes("open-copy") ? (
          <button className="secondary-button" onClick={() => onResolve("open-copy")}>
            {importConflictCopy.actionLabels.openCopy}
          </button>
        ) : null}
        <button className="secondary-button" onClick={() => onResolve("cancel")}>
          {importConflictCopy.actionLabels.cancel}
        </button>
      </div>
    </div>
  );
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
      weightKg: block.weightKg,
      group1: block.group1,
      group2: block.group2,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt
    });
  });

  return Array.from(templateMap.values());
}

function createTopBlockGroups(blockGroups: BlockGroup[]) {
  return blockGroups
    .filter((group) => group.parentGroupId === null)
    .sort(compareBlockGroupNames);
}

function createChildBlockGroups(blockGroups: BlockGroup[], parentGroupName: string) {
  const parentGroup = createTopBlockGroups(blockGroups).find((group) => group.name === parentGroupName);

  if (!parentGroup) {
    return [];
  }

  return blockGroups
    .filter((group) => group.parentGroupId === parentGroup.blockGroupId)
    .sort(compareBlockGroupNames);
}

function compareBlockGroupNames(left: BlockGroup, right: BlockGroup) {
  return left.name.localeCompare(right.name, "ko-KR");
}

function createBlockTemplateCardMeta(template: BlockTemplate) {
  return [
    formatDimensions(template.dimensions),
    formatOptionalWeightDisplay(template.weightKg),
    template.group1 ? `상위 ${template.group1}` : "상위그룹 없음",
    template.group2 ? `하위 ${template.group2}` : "하위그룹 없음",
    `v${template.entityVersion}`
  ];
}

function parseOptionalWeightKg(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function formatOptionalWeightFormValue(weightKg: number | null | undefined) {
  return typeof weightKg === "number" && Number.isFinite(weightKg) ? String(weightKg) : "";
}

function formatOptionalWeightDisplay(weightKg: number | null | undefined) {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg)) {
    return "무게 미입력";
  }

  return `${weightKg}kg`;
}

function formatDimensions(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  if (!hasPositiveDimensions(dimensions)) {
    return "입력 확인 필요";
  }

  return `${dimensions.widthMm} / ${dimensions.depthMm} / ${dimensions.heightMm}mm`;
}

function formatM3(value: number) {
  if (!Number.isFinite(value)) {
    return "0.000m³";
  }

  return `${value.toFixed(3)}m³`;
}

function formatBlockVolumeM3(block: BlockDefinition) {
  if (!isValidBlockMeasurementInput(block)) {
    return "입력 확인 필요";
  }

  return formatM3(calculateBlockVolumeM3(block));
}

function selectNumberFieldValue(event: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function formatNumberFieldDraftValue(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function getCommittedNumberFieldError(value: number, min: number) {
  if (!Number.isFinite(value)) {
    return "숫자를 입력하세요.";
  }

  if (!Number.isInteger(value)) {
    return "정수만 입력하세요.";
  }

  if (value < min) {
    return `${min} 이상 입력하세요.`;
  }

  return null;
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
  return normalizeWorkspaceForV2(workspace);
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
