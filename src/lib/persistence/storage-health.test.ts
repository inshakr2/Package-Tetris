import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultWorkspace } from "../workspace/workspace-factory";
import {
  createStorageHealthSnapshot,
  formatStorageBytes,
  hasMeaningfulWorkspaceData,
  readStorageHealth,
  requestStoragePersistence,
  shouldRemindExport
} from "./storage-health";

describe("storage-health", () => {
  it("의미 있는 사용자 데이터가 없으면 export 변경분이 있어도 리마인더를 숨긴다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      now: "2026-06-08T00:00:00.000Z"
    });
    workspace.updatedAt = "2026-06-08T00:10:00.000Z";
    workspace.lastExportedAt = null;

    // When / Then
    assert.equal(hasMeaningfulWorkspaceData(workspace), false);
    assert.equal(shouldRemindExport(workspace), false);
  });

  it("커스텀 데이터가 있고 마지막 export 이후 변경되면 리마인더를 표시한다", () => {
    // Given
    const workspace = createDefaultWorkspace({
      now: "2026-06-08T00:00:00.000Z"
    });
    workspace.blockTemplates.push({
      blockTemplateId: "template-a",
      entityVersion: 1,
      name: "A 박스",
      dimensions: { widthMm: 300, depthMm: 200, heightMm: 150 },
      fragile: false,
      createdAt: workspace.createdAt,
      updatedAt: workspace.createdAt
    });
    workspace.lastExportedAt = "2026-06-08T00:05:00.000Z";
    workspace.updatedAt = "2026-06-08T00:10:00.000Z";

    // When / Then
    assert.equal(hasMeaningfulWorkspaceData(workspace), true);
    assert.equal(shouldRemindExport(workspace), true);
  });

  it("저장 용량을 읽기 쉬운 단위와 percentage로 정리한다", () => {
    // Given / When
    const snapshot = createStorageHealthSnapshot({
      persisted: true,
      persistSupported: true,
      estimateSupported: true,
      estimate: {
        usage: 12 * 1024 * 1024,
        quota: 120 * 1024 * 1024
      }
    });

    // Then
    assert.equal(formatStorageBytes(512), "512B");
    assert.equal(formatStorageBytes(1536), "1.5KB");
    assert.equal(formatStorageBytes(12 * 1024 * 1024), "12MB");
    assert.equal(snapshot.usageLabel, "12MB");
    assert.equal(snapshot.quotaLabel, "120MB");
    assert.equal(snapshot.usageRatioLabel, "10%");
    assert.equal(snapshot.persistenceState, "persisted");
  });

  it("Storage API 미지원 또는 비보안 컨텍스트를 안내 상태로 반환한다", async () => {
    // Given / When
    const snapshot = await readStorageHealth(undefined, false);

    // Then
    assert.equal(snapshot.persistenceState, "unsupported");
    assert.equal(snapshot.persistSupported, false);
    assert.equal(snapshot.estimateSupported, false);
  });

  it("persist 요청 가능 여부는 persisted 조회 가능 여부와 분리해 판단한다", async () => {
    // Given
    const storage = {
      persist: async () => true
    };

    // When
    const snapshot = await readStorageHealth(storage, true);

    // Then
    assert.equal(snapshot.persistSupported, true);
    assert.equal(snapshot.persistenceState, "best-effort");
  });

  it("persist 요청 성공과 거절, 미지원을 구분한다", async () => {
    // Given
    const grantedStorage = {
      persist: async () => true
    };
    const deniedStorage = {
      persist: async () => false
    };

    // When / Then
    assert.equal(await requestStoragePersistence(grantedStorage, true), "persisted");
    assert.equal(await requestStoragePersistence(deniedStorage, true), "denied");
    assert.equal(await requestStoragePersistence(undefined, true), "unsupported");
    assert.equal(await requestStoragePersistence(grantedStorage, false), "unsupported");
  });
});
