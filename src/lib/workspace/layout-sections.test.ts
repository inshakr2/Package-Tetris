import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getWorkspaceSectionTitle, WORKSPACE_SECTION_ORDER } from "./layout-sections";

describe("workspace layout sections", () => {
  it("keeps the primary workspace flow in four vertical sections", () => {
    // Given
    const expectedSectionIds = ["space", "blocks", "review", "result"];

    // When
    const sectionIds = WORKSPACE_SECTION_ORDER.map((section) => section.sectionId);

    // Then
    assert.deepEqual(sectionIds, expectedSectionIds);
    assert.equal(getWorkspaceSectionTitle("space"), "1. 공간 라이브러리");
    assert.equal(getWorkspaceSectionTitle("blocks"), "2. 블록 라이브러리");
    assert.equal(getWorkspaceSectionTitle("review"), "3. 현재 적재 및 실행 전 검토");
    assert.equal(getWorkspaceSectionTitle("result"), "4. 결과 요약");
  });
});
