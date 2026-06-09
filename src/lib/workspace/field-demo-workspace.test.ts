import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIELD_DEMO_BLOCK_TEMPLATE_IDS,
  loadFieldDemoCurrentWork
} from "./field-demo-workspace";
import { resolveDraftBlocks } from "./block-library";
import { PRESET_SPACES } from "./presets";
import { reviewExecutionReadiness } from "./review-gate";
import { createDefaultWorkspace } from "./workspace-factory";
import type { TetrisWorkspace } from "./types";

describe("field-demo-workspace", () => {
  it("현장 시연 예제는 내 공간과 내 박스를 보존하고 현재 작업만 시연 데이터로 교체한다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-09T00:00:00.000Z"
    });
    const currentWorkspace: TetrisWorkspace = {
      ...workspace,
      lastExportedAt: "2026-06-09T00:10:00.000Z",
      spaces: [
        {
          spaceId: "space-custom",
          entityVersion: 1,
          name: "내 현장 차량",
          type: "custom",
          dimensions: { widthMm: 1800, depthMm: 1200, heightMm: 900 },
          offset: { widthMm: 50, depthMm: 50, heightMm: 50 },
          createdAt: "2026-06-09T00:05:00.000Z",
          updatedAt: "2026-06-09T00:05:00.000Z"
        }
      ],
      blockTemplates: [
        {
          blockTemplateId: "template-custom",
          entityVersion: 1,
          name: "사용자 저장 박스",
          dimensions: { widthMm: 300, depthMm: 220, heightMm: 180 },
          fragile: false,
          createdAt: "2026-06-09T00:06:00.000Z",
          updatedAt: "2026-06-09T00:06:00.000Z"
        }
      ],
      draft: {
        selectedSpaceId: "space-custom",
        blockItems: [
          {
            draftBlockItemId: "item-custom",
            blockTemplateId: "template-custom",
            quantity: 2,
            createdAt: "2026-06-09T00:07:00.000Z",
            updatedAt: "2026-06-09T00:07:00.000Z"
          }
        ],
        currentStep: "result",
        updatedAt: "2026-06-09T00:07:00.000Z"
      },
      recentResults: [
        {
          resultId: "result-a",
          createdAt: "2026-06-09T00:08:00.000Z",
          usedSpaceCount: 1,
          averageUtilizationRate: 35,
          unloadedBlockCount: 0,
          spaces: []
        }
      ],
      chainHistory: [
        {
          chainId: "chain-a",
          resultId: "result-a",
          blockId: "block-a",
          addedQuantity: 1,
          createdAt: "2026-06-09T00:09:00.000Z"
        }
      ]
    };

    // When
    const demoWorkspace = loadFieldDemoCurrentWork(currentWorkspace, "2026-06-09T01:00:00.000Z");

    // Then
    assert.equal(demoWorkspace.fileId, currentWorkspace.fileId);
    assert.equal(demoWorkspace.deviceId, currentWorkspace.deviceId);
    assert.equal(demoWorkspace.createdAt, currentWorkspace.createdAt);
    assert.equal(demoWorkspace.lastExportedAt, currentWorkspace.lastExportedAt);
    assert.deepEqual(demoWorkspace.spaces, currentWorkspace.spaces);
    assert.equal(demoWorkspace.revision, currentWorkspace.revision + 1);
    assert.equal(demoWorkspace.updatedAt, "2026-06-09T01:00:00.000Z");
    assert.equal(demoWorkspace.draft.selectedSpaceId, "preset-truck-2_5-ton-class");
    assert.equal(demoWorkspace.draft.currentStep, "blocks");
    assert.equal(demoWorkspace.draft.updatedAt, "2026-06-09T01:00:00.000Z");
    assert.deepEqual(demoWorkspace.recentResults, []);
    assert.deepEqual(demoWorkspace.chainHistory, []);
    assert.ok(demoWorkspace.blockTemplates.some((template) => template.blockTemplateId === "template-custom"));
    assert.equal(demoWorkspace.draft.blockItems.length, FIELD_DEMO_BLOCK_TEMPLATE_IDS.length);
    assert.deepEqual(
      demoWorkspace.draft.blockItems.map((item) => item.blockTemplateId),
      FIELD_DEMO_BLOCK_TEMPLATE_IDS
    );
    assert.ok(demoWorkspace.draft.blockItems.every((item) => item.quantity > 0));
  });

  it("현장 시연 예제는 반복해서 불러와도 예제 박스와 현재 작업 항목을 중복 누적하지 않는다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-09T00:00:00.000Z"
    });

    // When
    const firstWorkspace = loadFieldDemoCurrentWork(workspace, "2026-06-09T01:00:00.000Z");
    const secondWorkspace = loadFieldDemoCurrentWork(firstWorkspace, "2026-06-09T02:00:00.000Z");
    const demoTemplateIds = secondWorkspace.blockTemplates
      .map((template) => template.blockTemplateId)
      .filter((blockTemplateId) => FIELD_DEMO_BLOCK_TEMPLATE_IDS.includes(blockTemplateId));

    // Then
    assert.equal(new Set(demoTemplateIds).size, FIELD_DEMO_BLOCK_TEMPLATE_IDS.length);
    assert.equal(demoTemplateIds.length, FIELD_DEMO_BLOCK_TEMPLATE_IDS.length);
    assert.equal(secondWorkspace.draft.blockItems.length, FIELD_DEMO_BLOCK_TEMPLATE_IDS.length);
    assert.deepEqual(
      secondWorkspace.draft.blockItems.map((item) => item.blockTemplateId),
      FIELD_DEMO_BLOCK_TEMPLATE_IDS
    );
  });

  it("현장 시연 예제는 바로 결과 만들기를 실행할 수 있는 입력 조건을 만든다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-09T00:00:00.000Z"
    });

    // When
    const demoWorkspace = loadFieldDemoCurrentWork(workspace, "2026-06-09T01:00:00.000Z");
    const selectedSpace = PRESET_SPACES.find((space) => space.spaceId === demoWorkspace.draft.selectedSpaceId);
    const review = reviewExecutionReadiness({
      selectedSpace,
      blocks: resolveDraftBlocks(demoWorkspace),
      fragileStackOnFragileAllowed: demoWorkspace.policy.fragileStackOnFragileAllowed
    });

    // Then
    assert.notEqual(review.status, "error");
    assert.equal(review.cta.disabled, false);
    assert.ok(review.totals.totalBlockCount > 0);
  });
});
