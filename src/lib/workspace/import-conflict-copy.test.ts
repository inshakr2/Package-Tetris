import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getImportConflictCopy } from "./import-conflict-copy";
import type { ImportConflict } from "./types";

describe("import-conflict-copy", () => {
  it("같은 작업본의 다른 저장본은 내부 충돌 코드 없이 현장 언어로 설명한다", () => {
    // Given
    const conflict: ImportConflict = {
      kind: "same-file-revision-conflict",
      options: ["keep-current", "replace", "open-copy", "cancel"]
    };

    // When
    const copy = getImportConflictCopy(conflict);

    // Then
    assert.equal(copy.title, "같은 작업의 다른 저장본을 가져왔습니다.");
    assert.match(copy.description, /현재 화면과 가져온 파일 중 어떤 것을 사용할지 선택하세요/);
    assert.doesNotMatch(copy.description, /same-file|revision|conflict|different-file/);
    assert.equal(copy.backupHint, "대체하기 전에는 현재 화면을 백업 파일로 남겨두는 것이 안전합니다.");
    assert.equal(copy.actionLabels.keepCurrent, "현재 화면 유지");
    assert.equal(copy.actionLabels.replace, "가져온 파일로 대체");
    assert.equal(copy.actionLabels.openCopy, "복사본으로 열기");
    assert.equal(copy.actionLabels.cancel, "가져오기 취소");
  });

  it("다른 작업본 백업은 현재 작업을 덮어쓸 수 있음을 명확히 말한다", () => {
    // Given
    const conflict: ImportConflict = {
      kind: "different-file",
      options: ["replace", "open-copy", "cancel"]
    };

    // When
    const copy = getImportConflictCopy(conflict);

    // Then
    assert.equal(copy.title, "다른 작업의 백업 파일입니다.");
    assert.match(copy.description, /현재 작업을 바꾸거나/);
    assert.match(copy.description, /복사본으로 따로 열 수 있습니다/);
    assert.doesNotMatch(copy.description, /different-file|same-file|revision|conflict/);
  });
});
