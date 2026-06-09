import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addBlockTemplateToDraft, createBlockTemplate } from "./block-library";
import { resetCurrentWorkspace, hasCurrentWorkToReset } from "./current-work-reset";
import { createDefaultWorkspace } from "./workspace-factory";
import type { TetrisWorkspace } from "./types";

describe("current-work-reset", () => {
  it("현재 작업 초기화는 저장된 공간과 박스 라이브러리를 보존하고 draft와 결과만 비운다", () => {
    // Given
    const initialWorkspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-09T00:00:00.000Z"
    });
    const workspaceWithTemplate = createBlockTemplate(initialWorkspace, {
      blockTemplateId: "template-a",
      name: "현장 박스",
      dimensions: { widthMm: 300, depthMm: 200, heightMm: 100 },
      fragile: false,
      quantity: 5,
      addToDraft: false,
      now: "2026-06-09T01:00:00.000Z"
    });
    const workspaceWithDraft = addBlockTemplateToDraft(workspaceWithTemplate, {
      draftBlockItemId: "item-a",
      blockTemplateId: "template-a",
      quantity: 3,
      now: "2026-06-09T02:00:00.000Z"
    });
    const currentWorkspace: TetrisWorkspace = {
      ...workspaceWithDraft,
      lastExportedAt: "2026-06-09T02:30:00.000Z",
      spaces: [
        {
          spaceId: "space-a",
          entityVersion: 1,
          name: "현장 차량",
          type: "custom",
          dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
          offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
          createdAt: "2026-06-09T01:30:00.000Z",
          updatedAt: "2026-06-09T01:30:00.000Z"
        }
      ],
      draft: {
        ...workspaceWithDraft.draft,
        selectedSpaceId: "space-a",
        currentStep: "chain"
      },
      recentResults: [
        {
          resultId: "result-a",
          createdAt: "2026-06-09T02:10:00.000Z",
          usedSpaceCount: 1,
          averageUtilizationRate: 44,
          unloadedBlockCount: 0,
          spaces: []
        }
      ],
      chainHistory: [
        {
          chainId: "chain-a",
          resultId: "result-a",
          blockId: "template-a",
          blockTemplateId: "template-a",
          blockName: "현장 박스",
          addedQuantity: 1,
          createdAt: "2026-06-09T02:20:00.000Z"
        }
      ]
    };

    // When
    const resetWorkspace = resetCurrentWorkspace(currentWorkspace, "2026-06-09T03:00:00.000Z");

    // Then
    assert.equal(resetWorkspace.fileId, currentWorkspace.fileId);
    assert.equal(resetWorkspace.deviceId, currentWorkspace.deviceId);
    assert.equal(resetWorkspace.createdAt, currentWorkspace.createdAt);
    assert.deepEqual(resetWorkspace.spaces, currentWorkspace.spaces);
    assert.deepEqual(resetWorkspace.blockTemplates, currentWorkspace.blockTemplates);
    assert.deepEqual(resetWorkspace.policy, currentWorkspace.policy);
    assert.equal(resetWorkspace.lastExportedAt, currentWorkspace.lastExportedAt);
    assert.equal(resetWorkspace.revision, currentWorkspace.revision + 1);
    assert.equal(resetWorkspace.updatedAt, "2026-06-09T03:00:00.000Z");
    assert.deepEqual(resetWorkspace.draft, {
      selectedSpaceId: "preset-pallet-1150",
      blockItems: [],
      currentStep: "space",
      updatedAt: "2026-06-09T03:00:00.000Z"
    });
    assert.deepEqual(resetWorkspace.recentResults, []);
    assert.deepEqual(resetWorkspace.chainHistory, []);
  });

  it("현재 작업 초기화 필요 여부는 작업 박스, 결과, 체이닝, 선택 공간 변경을 기준으로 판단한다", () => {
    // Given
    const emptyWorkspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-09T00:00:00.000Z"
    });
    const workspaceWithSelectedSpace = {
      ...emptyWorkspace,
      draft: { ...emptyWorkspace.draft, selectedSpaceId: "preset-container-20ft-gp" }
    };

    // When
    const emptyNeedsReset = hasCurrentWorkToReset(emptyWorkspace);
    const selectedSpaceNeedsReset = hasCurrentWorkToReset(workspaceWithSelectedSpace);

    // Then
    assert.equal(emptyNeedsReset, false);
    assert.equal(selectedSpaceNeedsReset, true);
  });
});
