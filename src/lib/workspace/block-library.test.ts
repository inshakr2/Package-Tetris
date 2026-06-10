import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultWorkspace } from "./workspace-factory";
import {
  addBlockTemplateToDraft,
  createBlockGroup,
  createBlockTemplate,
  removeBlockGroup,
  removeDraftBlockItem,
  restoreDraftBlockItem,
  searchBlockTemplates,
  updateBlockTemplate,
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

  it("저장된 박스는 선택 입력인 무게와 상위/하위 그룹을 저장하고 수정한다", () => {
    // Given
    const workspace = createBlockTemplate(
      createDefaultWorkspace({
        deviceId: "device-a",
        fileId: "file-a",
        now: "2026-06-08T00:00:00.000Z"
      }),
      {
        blockTemplateId: "template-a",
        name: "스피커 박스",
        dimensions: { widthMm: 420, depthMm: 360, heightMm: 280 },
        fragile: false,
        weightKg: 12.5,
        group1: "금영",
        group2: "스피커",
        quantity: 5,
        addToDraft: false,
        now: "2026-06-08T01:00:00.000Z"
      }
    );

    // When
    const updated = updateBlockTemplate(workspace, {
      blockTemplateId: "template-a",
      name: "앰프 박스",
      dimensions: { widthMm: 430, depthMm: 370, heightMm: 290 },
      fragile: true,
      weightKg: null,
      group1: "엔터그레인",
      group2: "앰프",
      now: "2026-06-08T02:00:00.000Z"
    });

    // Then
    assert.equal(workspace.blockTemplates[0]?.weightKg, 12.5);
    assert.equal(workspace.blockTemplates[0]?.group1, "금영");
    assert.equal(workspace.blockTemplates[0]?.group2, "스피커");
    assert.equal(updated.blockTemplates[0]?.name, "앰프 박스");
    assert.equal(updated.blockTemplates[0]?.fragile, true);
    assert.equal(updated.blockTemplates[0]?.weightKg, null);
    assert.equal(updated.blockTemplates[0]?.group1, "엔터그레인");
    assert.equal(updated.blockTemplates[0]?.group2, "앰프");
    assert.equal(updated.blockTemplates[0]?.entityVersion, 2);
  });

  it("저장된 박스의 상위/하위 그룹은 별도 그룹 레지스트리로 등록되고 재사용된다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });

    // When
    const firstWorkspace = createBlockTemplate(workspace, {
      blockTemplateId: "template-a",
      name: "스피커 박스",
      dimensions: { widthMm: 420, depthMm: 360, heightMm: 280 },
      fragile: false,
      group1: "금영",
      group2: "스피커",
      addToDraft: false,
      now: "2026-06-08T01:00:00.000Z"
    });
    const secondWorkspace = createBlockTemplate(firstWorkspace, {
      blockTemplateId: "template-b",
      name: "스피커 박스 2",
      dimensions: { widthMm: 430, depthMm: 370, heightMm: 290 },
      fragile: false,
      group1: "금영",
      group2: "스피커",
      addToDraft: false,
      now: "2026-06-08T02:00:00.000Z"
    });

    // Then
    assert.equal(secondWorkspace.blockGroups.length, 2);
    const topGroup = secondWorkspace.blockGroups.find((group) => group.name === "금영");
    const childGroup = secondWorkspace.blockGroups.find((group) => group.name === "스피커");
    assert.ok(topGroup);
    assert.ok(childGroup);
    assert.equal(topGroup.parentGroupId, null);
    assert.equal(childGroup.parentGroupId, topGroup.blockGroupId);
  });

  it("그룹은 박스 저장 전에도 상위 그룹과 하위 그룹을 별도로 등록할 수 있다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });

    // When
    const topWorkspace = createBlockGroup(workspace, {
      name: "엔터그레인",
      parentGroupId: null,
      now: "2026-06-08T01:00:00.000Z"
    });
    const topGroup = topWorkspace.blockGroups.find((group) => group.name === "엔터그레인");

    if (!topGroup) {
      throw new Error("expected top group");
    }

    const childWorkspace = createBlockGroup(topWorkspace, {
      name: "앰프",
      parentGroupId: topGroup.blockGroupId,
      now: "2026-06-08T02:00:00.000Z"
    });

    // Then
    assert.equal(childWorkspace.blockGroups.length, 2);
    assert.equal(childWorkspace.blockGroups.find((group) => group.name === "앰프")?.parentGroupId, topGroup.blockGroupId);
    assert.equal(childWorkspace.revision, topWorkspace.revision + 1);
  });

  it("상위 그룹 삭제는 박스를 삭제하지 않고 해당 상위/하위 그룹 분류만 비운다", () => {
    // Given
    const workspace = createBlockTemplate(
      createDefaultWorkspace({
        deviceId: "device-a",
        fileId: "file-a",
        now: "2026-06-08T00:00:00.000Z"
      }),
      {
        blockTemplateId: "template-a",
        name: "스피커 박스",
        dimensions: { widthMm: 420, depthMm: 360, heightMm: 280 },
        fragile: false,
        group1: "금영",
        group2: "스피커",
        addToDraft: false,
        now: "2026-06-08T01:00:00.000Z"
      }
    );
    const topGroup = workspace.blockGroups.find((group) => group.name === "금영");

    if (!topGroup) {
      throw new Error("expected top group");
    }

    // When
    const nextWorkspace = removeBlockGroup(workspace, {
      blockGroupId: topGroup.blockGroupId,
      now: "2026-06-08T02:00:00.000Z"
    });

    // Then
    assert.equal(nextWorkspace.blockTemplates.length, 1);
    assert.equal(nextWorkspace.blockTemplates[0]?.group1, undefined);
    assert.equal(nextWorkspace.blockTemplates[0]?.group2, undefined);
    assert.equal(nextWorkspace.blockGroups.some((group) => group.name === "금영"), false);
    assert.equal(nextWorkspace.blockGroups.some((group) => group.name === "스피커"), false);
    assert.equal(nextWorkspace.revision, workspace.revision + 1);
  });

  it("하위 그룹 삭제는 상위 그룹과 박스를 유지하고 하위 그룹 분류만 비운다", () => {
    // Given
    const workspace = createBlockTemplate(
      createDefaultWorkspace({
        deviceId: "device-a",
        fileId: "file-a",
        now: "2026-06-08T00:00:00.000Z"
      }),
      {
        blockTemplateId: "template-a",
        name: "스피커 박스",
        dimensions: { widthMm: 420, depthMm: 360, heightMm: 280 },
        fragile: false,
        group1: "금영",
        group2: "스피커",
        addToDraft: false,
        now: "2026-06-08T01:00:00.000Z"
      }
    );
    const childGroup = workspace.blockGroups.find((group) => group.name === "스피커");

    if (!childGroup) {
      throw new Error("expected child group");
    }

    // When
    const nextWorkspace = removeBlockGroup(workspace, {
      blockGroupId: childGroup.blockGroupId,
      now: "2026-06-08T02:00:00.000Z"
    });

    // Then
    assert.equal(nextWorkspace.blockTemplates.length, 1);
    assert.equal(nextWorkspace.blockTemplates[0]?.group1, "금영");
    assert.equal(nextWorkspace.blockTemplates[0]?.group2, undefined);
    assert.equal(nextWorkspace.blockGroups.some((group) => group.name === "금영"), true);
    assert.equal(nextWorkspace.blockGroups.some((group) => group.name === "스피커"), false);
    assert.equal(nextWorkspace.revision, workspace.revision + 1);
  });

  it("저장 후 이번 작업에 바로 추가할 때 수량을 생략하면 작업 수량은 1개가 된다", () => {
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
      fragile: false,
      addToDraft: true,
      now: "2026-06-08T01:00:00.000Z"
    });

    // Then
    assert.equal(nextWorkspace.draft.blockItems[0]?.quantity, 1);
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

  it("저장된 박스 검색은 이름, 치수, 깨짐주의, 무게, 그룹을 현장 문구로 찾는다", () => {
    // Given
    const templates = [
      {
        blockTemplateId: "template-a",
        entityVersion: 1,
        name: "긴 박스 A",
        dimensions: { widthMm: 600, depthMm: 400, heightMm: 200 },
        fragile: false,
        weightKg: 12.5,
        group1: "금영",
        group2: "스피커",
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:00.000Z"
      },
      {
        blockTemplateId: "template-b",
        entityVersion: 1,
        name: "유리컵 박스",
        dimensions: { widthMm: 300, depthMm: 200, heightMm: 100 },
        fragile: true,
        weightKg: null,
        group1: "엔터그레인",
        group2: "소모품",
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    ];

    // When
    const nameMatches = searchBlockTemplates(templates, "유리컵");
    const dimensionMatches = searchBlockTemplates(templates, "600");
    const fragileMatches = searchBlockTemplates(templates, "깨짐주의");
    const weightMatches = searchBlockTemplates(templates, "12.5kg");
    const group1Matches = searchBlockTemplates(templates, "금영");
    const group2Matches = searchBlockTemplates(templates, "소모품");
    const allMatches = searchBlockTemplates(templates, "   ");

    // Then
    assert.deepEqual(nameMatches.map((template) => template.blockTemplateId), ["template-b"]);
    assert.deepEqual(dimensionMatches.map((template) => template.blockTemplateId), ["template-a"]);
    assert.deepEqual(fragileMatches.map((template) => template.blockTemplateId), ["template-b"]);
    assert.deepEqual(weightMatches.map((template) => template.blockTemplateId), ["template-a"]);
    assert.deepEqual(group1Matches.map((template) => template.blockTemplateId), ["template-a"]);
    assert.deepEqual(group2Matches.map((template) => template.blockTemplateId), ["template-b"]);
    assert.deepEqual(allMatches.map((template) => template.blockTemplateId), ["template-a", "template-b"]);
  });
});
