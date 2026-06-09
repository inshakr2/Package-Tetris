import { TetrisWorkspace } from "../workspace/types";

const DEFAULT_DB_NAME = "package-tetris";
const LEGACY_DB_NAME = "my-tetris";
const DB_VERSION = 1;
const STORE_NAME = "workspace_snapshots";
const ACTIVE_WORKSPACE_KEY = "active";

interface WorkspaceRecord {
  key: string;
  workspace: TetrisWorkspace;
}

interface SaveWorkspaceOptions {
  expectedRevision?: number | null;
}

interface WorkspaceSaveConflictDetails {
  storedRevision: number;
  incomingRevision: number;
  expectedRevision: number;
  storedUpdatedAt: string;
}

export class WorkspaceSaveConflictError extends Error {
  readonly storedRevision: number;
  readonly incomingRevision: number;
  readonly expectedRevision: number;
  readonly storedUpdatedAt: string;

  constructor(details: WorkspaceSaveConflictDetails) {
    super("다른 탭에서 최신 작업본이 먼저 저장되었습니다.");
    this.name = "WorkspaceSaveConflictError";
    this.storedRevision = details.storedRevision;
    this.incomingRevision = details.incomingRevision;
    this.expectedRevision = details.expectedRevision;
    this.storedUpdatedAt = details.storedUpdatedAt;
  }
}

export class IndexedDbTetrisStorage {
  private readonly dbName: string;
  private readonly legacyDbName: string | null;

  constructor(
    dbName = DEFAULT_DB_NAME,
    legacyDbName: string | null = dbName === DEFAULT_DB_NAME ? LEGACY_DB_NAME : null
  ) {
    this.dbName = dbName;
    this.legacyDbName = legacyDbName === dbName ? null : legacyDbName;
  }

  async saveWorkspace(workspace: TetrisWorkspace, options: SaveWorkspaceOptions = {}) {
    const db = await this.openDatabase(this.dbName);

    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const currentRecord = await requestToPromise<WorkspaceRecord | undefined>(
        store.get(ACTIVE_WORKSPACE_KEY)
      );

      assertCanSaveWorkspace(currentRecord?.workspace, workspace, options.expectedRevision);

      store.put({
        key: ACTIVE_WORKSPACE_KEY,
        workspace: cloneForStorage(workspace)
      } satisfies WorkspaceRecord);
      await waitForTransaction(transaction);
    } finally {
      db.close();
    }
  }

  async loadWorkspace() {
    const workspace = await this.loadWorkspaceFromDatabase(this.dbName);

    if (workspace || !this.legacyDbName) {
      return workspace;
    }

    const legacyWorkspace = await this.loadWorkspaceFromDatabase(this.legacyDbName);

    if (!legacyWorkspace) {
      return null;
    }

    await this.saveWorkspace(legacyWorkspace);
    return legacyWorkspace;
  }

  async clearWorkspace() {
    await this.clearWorkspaceFromDatabase(this.dbName);

    if (this.legacyDbName) {
      await this.clearWorkspaceFromDatabase(this.legacyDbName);
    }
  }

  private async loadWorkspaceFromDatabase(dbName: string) {
    const db = await this.openDatabase(dbName);

    try {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const record = await requestToPromise<WorkspaceRecord | undefined>(
        store.get(ACTIVE_WORKSPACE_KEY)
      );
      await waitForTransaction(transaction);
      return record?.workspace ?? null;
    } finally {
      db.close();
    }
  }

  private async clearWorkspaceFromDatabase(dbName: string) {
    const db = await this.openDatabase(dbName);

    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(ACTIVE_WORKSPACE_KEY);
      await waitForTransaction(transaction);
    } finally {
      db.close();
    }
  }

  private openDatabase(dbName: string) {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB를 열 수 없습니다."));
      };

      request.onblocked = () => {
        reject(new Error("다른 탭에서 IndexedDB 업그레이드가 차단되었습니다."));
      };
    });
  }
}

function assertCanSaveWorkspace(
  storedWorkspace: TetrisWorkspace | undefined,
  incomingWorkspace: TetrisWorkspace,
  expectedRevision: number | null | undefined
) {
  if (expectedRevision === null || expectedRevision === undefined || !storedWorkspace) {
    return;
  }

  if (storedWorkspace.fileId !== incomingWorkspace.fileId) {
    return;
  }

  if (storedWorkspace.revision <= expectedRevision) {
    return;
  }

  throw new WorkspaceSaveConflictError({
    storedRevision: storedWorkspace.revision,
    incomingRevision: incomingWorkspace.revision,
    expectedRevision,
    storedUpdatedAt: storedWorkspace.updatedAt
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 요청 실패"));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction 실패"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction 중단"));
  });
}

function cloneForStorage<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
