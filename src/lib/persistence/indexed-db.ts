import { TetrisWorkspace } from "../workspace/types";

const DEFAULT_DB_NAME = "my-tetris";
const DB_VERSION = 1;
const STORE_NAME = "workspace_snapshots";
const ACTIVE_WORKSPACE_KEY = "active";

interface WorkspaceRecord {
  key: string;
  workspace: TetrisWorkspace;
}

export class IndexedDbTetrisStorage {
  private readonly dbName: string;

  constructor(dbName = DEFAULT_DB_NAME) {
    this.dbName = dbName;
  }

  async saveWorkspace(workspace: TetrisWorkspace) {
    const db = await this.openDatabase();

    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
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
    const db = await this.openDatabase();

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

  async clearWorkspace() {
    const db = await this.openDatabase();

    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(ACTIVE_WORKSPACE_KEY);
      await waitForTransaction(transaction);
    } finally {
      db.close();
    }
  }

  private openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

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
