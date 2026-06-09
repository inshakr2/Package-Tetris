import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInitialWorkspaceSyncState,
  createLocalStorageSyncSignal,
  getActiveWorkspacePeerCount,
  reduceWorkspaceSyncState,
  shouldMarkWorkspaceStale
} from "./workspace-sync-channel";

describe("workspace-sync-channel", () => {
  it("다른 tab-opened 메시지를 active peer로 기록한다", () => {
    // Given
    const state = createInitialWorkspaceSyncState("tab-a");

    // When
    const nextState = reduceWorkspaceSyncState(
      state,
      {
        type: "tab-opened",
        tabId: "tab-b",
        sentAt: "2026-06-08T00:00:00.000Z"
      },
      "2026-06-08T00:00:00.000Z"
    );

    // Then
    assert.equal(getActiveWorkspacePeerCount(nextState, "2026-06-08T00:00:10.000Z"), 1);
  });

  it("같은 tabId 메시지는 무시한다", () => {
    // Given
    const state = createInitialWorkspaceSyncState("tab-a");

    // When
    const nextState = reduceWorkspaceSyncState(
      state,
      {
        type: "tab-opened",
        tabId: "tab-a",
        sentAt: "2026-06-08T00:00:00.000Z"
      },
      "2026-06-08T00:00:00.000Z"
    );

    // Then
    assert.equal(getActiveWorkspacePeerCount(nextState, "2026-06-08T00:00:10.000Z"), 0);
  });

  it("workspace-saved 메시지에서 원격 revision을 기록하고 stale 여부를 판단한다", () => {
    // Given
    const state = createInitialWorkspaceSyncState("tab-a");

    // When
    const nextState = reduceWorkspaceSyncState(
      state,
      {
        type: "workspace-saved",
        tabId: "tab-b",
        sentAt: "2026-06-08T00:00:01.000Z",
        fileId: "file-a",
        revision: 7,
        updatedAt: "2026-06-08T00:00:01.000Z"
      },
      "2026-06-08T00:00:01.000Z"
    );

    // Then
    assert.equal(nextState.remoteSave?.revision, 7);
    assert.equal(
      shouldMarkWorkspaceStale({
        fileId: "file-a",
        lastPersistedRevision: 5,
        remoteSave: nextState.remoteSave
      }),
      true
    );
  });

  it("TTL이 지난 peer는 active peer에서 제외한다", () => {
    // Given
    const state = reduceWorkspaceSyncState(
      createInitialWorkspaceSyncState("tab-a"),
      {
        type: "tab-opened",
        tabId: "tab-b",
        sentAt: "2026-06-08T00:00:00.000Z"
      },
      "2026-06-08T00:00:00.000Z"
    );

    // When / Then
    assert.equal(getActiveWorkspacePeerCount(state, "2026-06-08T00:00:20.000Z", 15_000), 0);
  });

  it("tab-closed 메시지를 받으면 active peer에서 제거한다", () => {
    // Given
    const state = reduceWorkspaceSyncState(
      createInitialWorkspaceSyncState("tab-a"),
      {
        type: "tab-present",
        tabId: "tab-b",
        sentAt: "2026-06-08T00:00:00.000Z"
      },
      "2026-06-08T00:00:00.000Z"
    );

    // When
    const nextState = reduceWorkspaceSyncState(
      state,
      {
        type: "tab-closed",
        tabId: "tab-b",
        sentAt: "2026-06-08T00:00:02.000Z"
      },
      "2026-06-08T00:00:02.000Z"
    );

    // Then
    assert.equal(getActiveWorkspacePeerCount(nextState, "2026-06-08T00:00:03.000Z"), 0);
  });

  it("BroadcastChannel 미지원 fallback용 localStorage signal payload를 만든다", () => {
    // Given / When
    const signal = createLocalStorageSyncSignal({
      type: "workspace-saved",
      tabId: "tab-a",
      sentAt: "2026-06-08T00:00:00.000Z",
      fileId: "file-a",
      revision: 3,
      updatedAt: "2026-06-08T00:00:00.000Z"
    });

    // Then
    assert.equal(signal.key, "package-tetris-workspace-sync");
    assert.match(signal.value, /workspace-saved/);
    assert.equal(JSON.parse(signal.value).revision, 3);
  });
});
