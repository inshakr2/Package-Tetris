import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultWorkspace } from "./workspace-factory";
import {
  addBlockTemplateToDraft,
  createBlockTemplate,
  removeDraftBlockItem,
  restoreDraftBlockItem,
  updateDraftBlockItemQuantity
} from "./block-library";

describe("block-library", () => {
  it("커스텀 블록은 라이브러리 템플릿으로 저장되고 현재 작업에는 templateId와 수량만 추가된다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });

    // When
    const nextWorkspace = createBlockTemplate(workspace, {
      blockTemplateId: "template-a",
      name: "A-박스",
      dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
      fragile: true,
      quantity: 12,
      addToDraft: true,
      now: "2026-06-08T01:00:00.000Z"
    });

    // Then
    assert.equal(nextWorkspace.blockTemplates.length, 1);
    assert.equal(nextWorkspace.blockTemplates[0]?.name, "A-박스");
    assert.equal(nextWorkspace.blockTemplates[0]?.fragile, true);
    assert.equal(nextWorkspace.draft.blockItems.length, 1);
    assert.equal(nextWorkspace.draft.blockItems[0]?.blockTemplateId, "template-a");
    assert.equal(nextWorkspace.draft.blockItems[0]?.quantity, 12);
  });

  it("라이브러리 블록은 여러 번 현재 작업에 재사용할 수 있고 수량은 작업 항목별로 독립된다", () => {
    // Given
    const workspace = createBlockTemplate(
      createDefaultWorkspace({
        deviceId: "device-a",
        fileId: "file-a",
        now: "2026-06-08T00:00:00.000Z"
      }),
      {
        blockTemplateId: "template-a",
        name: "A-박스",
        dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
        fragile: false,
        quantity: 5,
        addToDraft: false,
        now: "2026-06-08T01:00:00.000Z"
      }
    );

    // When
    const firstAdd = addBlockTemplateToDraft(workspace, {
      draftBlockItemId: "item-a",
      blockTemplateId: "template-a",
      quantity: 3,
      now: "2026-06-08T02:00:00.000Z"
    });
    const secondAdd = addBlockTemplateToDraft(firstAdd, {
      draftBlockItemId: "item-b",
      blockTemplateId: "template-a",
      quantity: 7,
      now: "2026-06-08T03:00:00.000Z"
    });
    const updated = updateDraftBlockItemQuantity(secondAdd, {
      draftBlockItemId: "item-a",
      quantity: 9,
      now: "2026-06-08T04:00:00.000Z"
    });

    // Then
    assert.equal(updated.blockTemplates.length, 1);
    assert.equal(updated.draft.blockItems.length, 2);
    assert.equal(updated.draft.blockItems.find((item) => item.draftBlockItemId === "item-a")?.quantity, 9);
    assert.equal(updated.draft.blockItems.find((item) => item.draftBlockItemId === "item-b")?.quantity, 7);
  });

  it("현재 작업에서 블록을 제거해도 라이브러리 템플릿은 삭제하지 않는다", () => {
    // Given
    const workspace = addBlockTemplateToDraft(
      createBlockTemplate(
        createDefaultWorkspace({
          deviceId: "device-a",
          fileId: "file-a",
          now: "2026-06-08T00:00:00.000Z"
        }),
        {
          blockTemplateId: "template-a",
          name: "A-박스",
          dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
          fragile: false,
          quantity: 5,
          addToDraft: false,
          now: "2026-06-08T01:00:00.000Z"
        }
      ),
      {
        draftBlockItemId: "item-a",
        blockTemplateId: "template-a",
        quantity: 3,
        now: "2026-06-08T02:00:00.000Z"
      }
    );

    // When
    const nextWorkspace = removeDraftBlockItem(workspace, {
      draftBlockItemId: "item-a",
      now: "2026-06-08T03:00:00.000Z"
    });

    // Then
    assert.equal(nextWorkspace.blockTemplates.length, 1);
    assert.equal(nextWorkspace.draft.blockItems.length, 0);
  });

  it("제거된 현재 작업 박스를 원래 순서와 수량으로 복구한다", () => {
    // Given
    const workspace = addBlockTemplateToDraft(
      addBlockTemplateToDraft(
        createBlockTemplate(
          createDefaultWorkspace({
            deviceId: "device-a",
            fileId: "file-a",
            now: "2026-06-08T00:00:00.000Z"
          }),
          {
            blockTemplateId: "template-a",
            name: "A-박스",
            dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
            fragile: false,
            quantity: 5,
            addToDraft: false,
            now: "2026-06-08T01:00:00.000Z"
          }
        ),
        {
          draftBlockItemId: "item-a",
          blockTemplateId: "template-a",
          quantity: 3,
          now: "2026-06-08T02:00:00.000Z"
        }
      ),
      {
        draftBlockItemId: "item-b",
        blockTemplateId: "template-a",
        quantity: 7,
        now: "2026-06-08T03:00:00.000Z"
      }
    );
    const removedItem = workspace.draft.blockItems[0];

    if (!removedItem) {
      throw new Error("expected removed draft item");
    }

    const removedWorkspace = removeDraftBlockItem(workspace, {
      draftBlockItemId: removedItem.draftBlockItemId,
      now: "2026-06-08T04:00:00.000Z"
    });

    // When
    const restoredWorkspace = restoreDraftBlockItem(removedWorkspace, {
      item: removedItem,
      index: 0,
      now: "2026-06-08T05:00:00.000Z"
    });

    // Then
    assert.deepEqual(
      restoredWorkspace.draft.blockItems.map((item) => [item.draftBlockItemId, item.quantity]),
      [
        ["item-a", 3],
        ["item-b", 7]
      ]
    );
    assert.equal(restoredWorkspace.revision, removedWorkspace.revision + 1);
    assert.equal(restoredWorkspace.updatedAt, "2026-06-08T05:00:00.000Z");
    assert.equal(restoredWorkspace.draft.updatedAt, "2026-06-08T05:00:00.000Z");
    assert.equal(restoredWorkspace.draft.currentStep, "blocks");
  });

  it("같은 draftBlockItemId가 이미 있으면 현재 작업 박스를 중복 복구하지 않는다", () => {
    // Given
    const workspace = addBlockTemplateToDraft(
      createBlockTemplate(
        createDefaultWorkspace({
          deviceId: "device-a",
          fileId: "file-a",
          now: "2026-06-08T00:00:00.000Z"
        }),
        {
          blockTemplateId: "template-a",
          name: "A-박스",
          dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
          fragile: false,
          quantity: 5,
          addToDraft: false,
          now: "2026-06-08T01:00:00.000Z"
        }
      ),
      {
        draftBlockItemId: "item-a",
        blockTemplateId: "template-a",
        quantity: 3,
        now: "2026-06-08T02:00:00.000Z"
      }
    );
    const existingItem = workspace.draft.blockItems[0];

    if (!existingItem) {
      throw new Error("expected existing draft item");
    }

    // When
    const restoredWorkspace = restoreDraftBlockItem(workspace, {
      item: existingItem,
      index: 0,
      now: "2026-06-08T03:00:00.000Z"
    });

    // Then
    assert.equal(restoredWorkspace, workspace);
  });

  it("연결된 저장된 박스가 없으면 현재 작업 박스를 복구하지 않는다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });

    // When
    const restoredWorkspace = restoreDraftBlockItem(workspace, {
      item: {
        draftBlockItemId: "item-a",
        blockTemplateId: "missing-template",
        quantity: 3,
        createdAt: "2026-06-08T02:00:00.000Z",
        updatedAt: "2026-06-08T02:00:00.000Z"
      },
      index: 0,
      now: "2026-06-08T03:00:00.000Z"
    });

    // Then
    assert.equal(restoredWorkspace, workspace);
  });

  it("복구 index가 범위를 벗어나면 안전한 위치로 보정한다", () => {
    // Given
    const workspace = addBlockTemplateToDraft(
      createBlockTemplate(
        createDefaultWorkspace({
          deviceId: "device-a",
          fileId: "file-a",
          now: "2026-06-08T00:00:00.000Z"
        }),
        {
          blockTemplateId: "template-a",
          name: "A-박스",
          dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
          fragile: false,
          quantity: 5,
          addToDraft: false,
          now: "2026-06-08T01:00:00.000Z"
        }
      ),
      {
        draftBlockItemId: "item-a",
        blockTemplateId: "template-a",
        quantity: 3,
        now: "2026-06-08T02:00:00.000Z"
      }
    );
    const baseItem = workspace.draft.blockItems[0];

    if (!baseItem) {
      throw new Error("expected draft item");
    }

    // When
    const negativeIndexWorkspace = restoreDraftBlockItem(workspace, {
      item: {
        ...baseItem,
        draftBlockItemId: "item-before"
      },
      index: -5,
      now: "2026-06-08T03:00:00.000Z"
    });
    const overflowIndexWorkspace = restoreDraftBlockItem(workspace, {
      item: {
        ...baseItem,
        draftBlockItemId: "item-after"
      },
      index: 99,
      now: "2026-06-08T03:00:00.000Z"
    });

    // Then
    assert.deepEqual(
      negativeIndexWorkspace.draft.blockItems.map((item) => item.draftBlockItemId),
      ["item-before", "item-a"]
    );
    assert.deepEqual(
      overflowIndexWorkspace.draft.blockItems.map((item) => item.draftBlockItemId),
      ["item-a", "item-after"]
    );
  });
});
