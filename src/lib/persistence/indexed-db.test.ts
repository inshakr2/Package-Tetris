import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import "fake-indexeddb/auto";
import { createDefaultWorkspace } from "../workspace/workspace-factory";
import { IndexedDbTetrisStorage } from "./indexed-db";

describe("IndexedDbTetrisStorage", () => {
  beforeEach(async () => {
    await deleteDatabase("my-tetris-test");
  });

  it("커스텀 공간, 커스텀 블록, draft를 IndexedDB에 저장하고 다시 복원한다", async () => {
    // Given
    const storage = new IndexedDbTetrisStorage("my-tetris-test");
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
});

function deleteDatabase(dbName: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("테스트 DB 삭제 실패"));
    request.onblocked = () => reject(new Error("테스트 DB 삭제가 차단되었습니다."));
  });
}
