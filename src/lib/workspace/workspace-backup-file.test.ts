import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWorkspaceBackupFilename } from "./workspace-backup-file";

describe("workspace-backup-file", () => {
  it("작업 백업 JSON 파일명은 Package Tetris 저장소명 기준으로 만든다", () => {
    // Given
    const localDate = new Date(2026, 5, 9, 8, 30, 0);

    // When
    const filename = createWorkspaceBackupFilename(localDate);

    // Then
    assert.equal(filename, "package-tetris-library-2026-06-09.json");
  });
});
