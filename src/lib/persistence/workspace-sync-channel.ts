export const WORKSPACE_SYNC_CHANNEL_NAME = "my-tetris-workspace-sync";
export const DEFAULT_WORKSPACE_PEER_TTL_MS = 15_000;

export type WorkspaceSyncMessage =
  | {
      type: "tab-opened" | "tab-present" | "tab-closed";
      tabId: string;
      sentAt: string;
    }
  | {
      type: "workspace-saved";
      tabId: string;
      sentAt: string;
      fileId: string;
      revision: number;
      updatedAt: string;
    };

export interface WorkspaceRemoteSave {
  tabId: string;
  fileId: string;
  revision: number;
  updatedAt: string;
  receivedAt: string;
}

export interface WorkspacePeer {
  tabId: string;
  lastSeenAt: string;
}

export interface WorkspaceSyncState {
  selfTabId: string;
  peers: Record<string, WorkspacePeer>;
  remoteSave: WorkspaceRemoteSave | null;
}

export interface WorkspaceStaleInput {
  fileId: string | null | undefined;
  lastPersistedRevision: number | null | undefined;
  remoteSave: WorkspaceRemoteSave | null | undefined;
}

export interface LocalStorageSyncSignal {
  key: typeof WORKSPACE_SYNC_CHANNEL_NAME;
  value: string;
}

export function createInitialWorkspaceSyncState(selfTabId: string): WorkspaceSyncState {
  return {
    selfTabId,
    peers: {},
    remoteSave: null
  };
}

export function reduceWorkspaceSyncState(
  state: WorkspaceSyncState,
  message: WorkspaceSyncMessage,
  receivedAt: string
): WorkspaceSyncState {
  if (message.tabId === state.selfTabId) {
    return state;
  }

  if (message.type === "tab-closed") {
    const { [message.tabId]: _closedPeer, ...peers } = state.peers;
    return {
      ...state,
      peers
    };
  }

  const peers = {
    ...state.peers,
    [message.tabId]: {
      tabId: message.tabId,
      lastSeenAt: receivedAt
    }
  };

  if (message.type === "workspace-saved") {
    return {
      ...state,
      peers,
      remoteSave: {
        tabId: message.tabId,
        fileId: message.fileId,
        revision: message.revision,
        updatedAt: message.updatedAt,
        receivedAt
      }
    };
  }

  return {
    ...state,
    peers
  };
}

export function getActiveWorkspacePeerCount(
  state: WorkspaceSyncState,
  now: string,
  ttlMs = DEFAULT_WORKSPACE_PEER_TTL_MS
) {
  return Object.values(state.peers).filter((peer) => !isExpired(peer.lastSeenAt, now, ttlMs)).length;
}

export function shouldMarkWorkspaceStale(input: WorkspaceStaleInput) {
  if (!input.fileId || input.lastPersistedRevision === null || input.lastPersistedRevision === undefined) {
    return false;
  }

  if (!input.remoteSave || input.remoteSave.fileId !== input.fileId) {
    return false;
  }

  return input.remoteSave.revision > input.lastPersistedRevision;
}

export function createLocalStorageSyncSignal(message: WorkspaceSyncMessage): LocalStorageSyncSignal {
  return {
    key: WORKSPACE_SYNC_CHANNEL_NAME,
    value: JSON.stringify(message)
  };
}

function isExpired(lastSeenAt: string, now: string, ttlMs: number) {
  return new Date(now).getTime() - new Date(lastSeenAt).getTime() > ttlMs;
}
