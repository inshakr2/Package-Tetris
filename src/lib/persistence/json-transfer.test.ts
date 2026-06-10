import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PALLET_SPACE_ID } from "../workspace/presets";
import { createDefaultWorkspace } from "../workspace/workspace-factory";
import {
  copyWorkspaceForNewFile,
  detectImportConflict,
  exportWorkspaceToJson,
  parseWorkspaceImport
} from "./json-transfer";

describe("json-transfer", () => {
  it("JSON export에 schema, device, 정책, 커스텀 데이터, draft, 결과, 체이닝 상태를 포함한다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });
    workspace.policy.partialSupportEnabled = true;
    workspace.policy.minimumSupportRatio = 0.55;
    workspace.blockTemplates.push({
      blockTemplateId: "template-a",
      entityVersion: 1,
      name: "A-박스",
      dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
      fragile: false,
      weightKg: 4.5,
      group1: "금영",
      group2: "스피커",
      createdAt: workspace.updatedAt,
      updatedAt: workspace.updatedAt
    });
    workspace.recentResults.push({
      resultId: "result-a",
      createdAt: workspace.updatedAt,
      usedSpaceCount: 1,
      averageUtilizationRate: 0.82,
      unloadedBlockCount: 0,
      spaceSnapshot: {
        spaceId: "space-result",
        entityVersion: 1,
        name: "결과 기준 공간",
        type: "custom",
        dimensions: { widthMm: 1000, depthMm: 900, heightMm: 1200 },
        offset: { widthMm: 20, depthMm: 20, heightMm: 50 },
        createdAt: workspace.updatedAt,
        updatedAt: workspace.updatedAt
      }
    });
    workspace.chainHistory.push({
      chainId: "chain-a",
      resultId: "result-a",
      blockId: "block-a",
      blockTemplateId: "template-a",
      blockName: "추가 박스",
      addedQuantity: 3,
      previousAverageUtilizationRate: 0.82,
      createdAt: workspace.updatedAt
    });

    // When
    const parsed = JSON.parse(exportWorkspaceToJson(workspace));

    // Then
    assert.equal(parsed.schema_version, 2);
    assert.equal(parsed.device_id, "device-a");
    assert.equal(parsed.policy.truck_preset_display_name, "2.5톤반");
    assert.equal(parsed.policy.fragile_stack_on_fragile_allowed, true);
    assert.equal(parsed.policy.partial_support_enabled, true);
    assert.equal(parsed.policy.minimum_support_ratio, 0.55);
    assert.ok(parsed.draft);
    assert.equal(parsed.recent_results.length, 1);
    assert.equal(parsed.recent_results[0].spaceSnapshot.name, "결과 기준 공간");
    assert.equal(parsed.chain_history.length, 1);
    assert.equal(parsed.chain_history[0].blockName, "추가 박스");
    assert.equal(parsed.chain_history[0].previousAverageUtilizationRate, 0.82);
    assert.ok(Array.isArray(parsed.custom_blocks));
    assert.equal(parsed.custom_blocks[0].weightKg, 4.5);
    assert.equal(parsed.custom_blocks[0].group1, "금영");
    assert.equal(parsed.custom_blocks[0].group2, "스피커");
  });

  it("V1 백업 JSON은 V2 작업본으로 보정해서 가져온다", () => {
    // Given
    const v1Payload = {
      schema_version: 1,
      app_version: "0.1.0",
      exported_at: "2026-06-09T00:00:00.000Z",
      device_id: "device-v1",
      file_id: "file-v1",
      revision: 7,
      created_at: "2026-06-08T00:00:00.000Z",
      updated_at: "2026-06-09T00:00:00.000Z",
      policy: {
        fragile_stack_on_fragile_allowed: true,
        truck_preset_display_name: "2.5톤반"
      },
      custom_spaces: [],
      custom_blocks: [
        {
          blockTemplateId: "template-v1",
          entityVersion: 1,
          name: "V1 박스",
          dimensions: { widthMm: 300, depthMm: 200, heightMm: 120 },
          fragile: false,
          createdAt: "2026-06-08T00:00:00.000Z",
          updatedAt: "2026-06-08T00:00:00.000Z"
        }
      ],
      draft: {
        selectedSpaceId: "preset-pallet-1150",
        blockItems: [
          {
            draftBlockItemId: "item-v1",
            blockTemplateId: "template-v1",
            quantity: 5,
            createdAt: "2026-06-08T00:00:00.000Z",
            updatedAt: "2026-06-08T00:00:00.000Z"
          }
        ],
        currentStep: "blocks",
        updatedAt: "2026-06-09T00:00:00.000Z"
      },
      recent_results: [],
      chain_history: []
    };

    // When
    const workspace = parseWorkspaceImport(JSON.stringify(v1Payload));

    // Then
    assert.equal(workspace.schemaVersion, 2);
    assert.equal(workspace.policy.partialSupportEnabled, false);
    assert.equal(workspace.policy.minimumSupportRatio, 1);
    assert.equal(workspace.blockTemplates[0]?.weightKg, null);
    assert.equal(workspace.blockTemplates[0]?.group1, undefined);
    assert.equal(workspace.blockTemplates[0]?.group2, undefined);
    assert.equal(workspace.draft.selectedSpaceId, DEFAULT_PALLET_SPACE_ID);
    assert.equal(workspace.draft.blockItems[0]?.loadPriority, null);
  });

  it("지원 범위 밖 schema_version은 가져오기를 거부한다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });
    const payload = JSON.parse(exportWorkspaceToJson(workspace));
    payload.schema_version = 99;

    // When / Then
    assert.throws(() => parseWorkspaceImport(JSON.stringify(payload)), /지원하지 않는 schema_version/);
  });

  it("같은 file_id의 다른 revision을 가져오면 충돌로 판정한다", () => {
    // Given
    const localWorkspace = createDefaultWorkspace({
      deviceId: "device-a",
      fileId: "file-a",
      now: "2026-06-08T00:00:00.000Z"
    });
    localWorkspace.revision = 4;

    const importedWorkspace = createDefaultWorkspace({
      deviceId: "device-b",
      fileId: "file-a",
      now: "2026-06-08T01:00:00.000Z"
    });
    importedWorkspace.revision = 5;

    // When
    const conflict = detectImportConflict(localWorkspace, importedWorkspace);

    // Then
    assert.equal(conflict.kind, "same-file-revision-conflict");
    assert.deepEqual(conflict.options, ["keep-current", "replace", "open-copy", "cancel"]);
  });

  it("복사본으로 열기는 file_id와 revision을 새로 발급하고 원본 커스텀 데이터를 유지한다", () => {
    // Given
    const importedWorkspace = createDefaultWorkspace({
      deviceId: "device-b",
      fileId: "file-a",
      now: "2026-06-08T01:00:00.000Z"
    });
    importedWorkspace.spaces.push({
      spaceId: "space-custom-1",
      entityVersion: 1,
      name: "현장 팔레트 A",
      type: "custom",
      dimensions: { widthMm: 1000, depthMm: 900, heightMm: 1200 },
      offset: { widthMm: 20, depthMm: 20, heightMm: 50 },
      createdAt: importedWorkspace.updatedAt,
      updatedAt: importedWorkspace.updatedAt
    });

    // When
    const copy = copyWorkspaceForNewFile(importedWorkspace, {
      deviceId: "device-a",
      fileId: "file-copy",
      now: "2026-06-08T02:00:00.000Z"
    });

    // Then
    assert.equal(copy.fileId, "file-copy");
    assert.equal(copy.revision, 1);
    assert.equal(copy.spaces[0]?.name, "현장 팔레트 A");
  });

  it("위험한 prototype key가 포함된 import JSON을 거부한다", () => {
    // Given
    const maliciousJson = "{\"schema_version\":2,\"__proto__\":{\"polluted\":true}}";

    // When / Then
    assert.throws(() => parseWorkspaceImport(maliciousJson), /허용되지 않는 키/);
  });
});
