import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import "fake-indexeddb/auto";
import { createDefaultWorkspace } from "../workspace/workspace-factory";
import { IndexedDbTetrisStorage, WorkspaceSaveConflictError } from "./indexed-db";

const TEST_DB_NAME = "package-tetris-test";
const LEGACY_TEST_DB_NAME = "my-tetris-test";

describe("IndexedDbTetrisStorage", () => {
  beforeEach(async () => {
    await deleteDatabase(TEST_DB_NAME);
    await deleteDatabase(LEGACY_TEST_DB_NAME);
  });

  it("새 Package Tetris 저장소가 기존 my-tetris 작업본을 읽고 새 저장소로 옮긴다", async () => {
    // Given
    const legacyStorage = new IndexedDbTetrisStorage(LEGACY_TEST_DB_NAME, null);
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-09T00:00:00.000Z"
    });
    workspace.spaces.push({
      spaceId: "space-legacy-1",
      entityVersion: 1,
      name: "기존 현장 공간",
      type: "custom",
      dimensions: { widthMm: 1100, depthMm: 1000, heightMm: 1400 },
      offset: { widthMm: 20, depthMm: 20, heightMm: 60 },
      createdAt: workspace.updatedAt,
      updatedAt: workspace.updatedAt
    });
    await legacyStorage.saveWorkspace(workspace);

    // When
    const storage = new IndexedDbTetrisStorage(TEST_DB_NAME, LEGACY_TEST_DB_NAME);
    const restored = await storage.loadWorkspace();

    // Then
    assert.equal(restored?.spaces[0]?.name, "기존 현장 공간");

    const migratedStorage = new IndexedDbTetrisStorage(TEST_DB_NAME, null);
    const migrated = await migratedStorage.loadWorkspace();
    assert.equal(migrated?.fileId, "file-a");
    assert.equal(migrated?.spaces[0]?.name, "기존 현장 공간");
  });

  it("커스텀 공간, 커스텀 블록, draft를 IndexedDB에 저장하고 다시 복원한다", async () => {
    // Given
    const storage = new IndexedDbTetrisStorage(TEST_DB_NAME, LEGACY_TEST_DB_NAME);
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });

    workspace.spaces.push({
      spaceId: "space-custom-1",
      entityVersion: 1,
      name: "현장 팔레트 A",
      type: "custom",
      dimensions: { widthMm: 1000, depthMm: 900, heightMm: 1200 },
      offset: { widthMm: 20, depthMm: 20, heightMm: 50 },
      createdAt: workspace.updatedAt,
      updatedAt: workspace.updatedAt
    });
    workspace.blockTemplates.push({
      blockTemplateId: "block-custom-1",
      entityVersion: 1,
      name: "A-박스",
      dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
      fragile: true,
      createdAt: workspace.updatedAt,
      updatedAt: workspace.updatedAt
    });
    workspace.draft.selectedSpaceId = "space-custom-1";
    workspace.draft.blockItems = [
      {
        draftBlockItemId: "item-custom-1",
        blockTemplateId: "block-custom-1",
        quantity: 12,
        createdAt: workspace.updatedAt,
        updatedAt: workspace.updatedAt
      }
    ];

    // When
    await storage.saveWorkspace(workspace);
    const restored = await storage.loadWorkspace();

    // Then
    assert.equal(restored?.spaces.length, 1);
    assert.equal(restored?.spaces[0]?.name, "현장 팔레트 A");
    assert.equal(restored?.blockTemplates[0]?.fragile, true);
    assert.equal(restored?.draft.selectedSpaceId, "space-custom-1");
    assert.equal(restored?.draft.blockItems[0]?.quantity, 12);
  });

  it("저장소 revision이 expectedRevision보다 최신이면 stale 탭 저장을 거부한다", async () => {
    // Given
    const storage = new IndexedDbTetrisStorage(TEST_DB_NAME, LEGACY_TEST_DB_NAME);
    const firstTabWorkspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });
    await storage.saveWorkspace(firstTabWorkspace);

    const secondTabWorkspace = {
      ...firstTabWorkspace,
      revision: 2,
      updatedAt: "2026-06-08T00:10:00.000Z"
    };
    await storage.saveWorkspace(secondTabWorkspace, { expectedRevision: 1 });

    const staleFirstTabWorkspace = {
      ...firstTabWorkspace,
      revision: 2,
      updatedAt: "2026-06-08T00:20:00.000Z"
    };

    // When / Then
    await assert.rejects(
      () => storage.saveWorkspace(staleFirstTabWorkspace, { expectedRevision: 1 }),
      (error) => {
        assert.ok(error instanceof WorkspaceSaveConflictError);
        assert.equal(error.storedRevision, 2);
        assert.equal(error.incomingRevision, 2);
        assert.equal(error.expectedRevision, 1);
        assert.equal(error.storedUpdatedAt, "2026-06-08T00:10:00.000Z");
        return true;
      }
    );

    const restored = await storage.loadWorkspace();
    assert.equal(restored?.updatedAt, "2026-06-08T00:10:00.000Z");
  });

  it("다른 fileId 작업본은 expectedRevision과 무관하게 active 작업본으로 저장한다", async () => {
    // Given
    const storage = new IndexedDbTetrisStorage(TEST_DB_NAME, LEGACY_TEST_DB_NAME);
    const currentWorkspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });
    await storage.saveWorkspace({
      ...currentWorkspace,
      revision: 5,
      updatedAt: "2026-06-08T00:10:00.000Z"
    });

    const importedCopy = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-copy",
      now: "2026-06-08T00:20:00.000Z"
    });

    // When
    await storage.saveWorkspace(importedCopy, { expectedRevision: 1 });

    // Then
    const restored = await storage.loadWorkspace();
    assert.equal(restored?.fileId, "file-copy");
    assert.equal(restored?.revision, 1);
  });
});

function deleteDatabase(dbName: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("테스트 DB 삭제 실패"));
    request.onblocked = () => reject(new Error("테스트 DB 삭제가 차단되었습니다."));
  });
}
