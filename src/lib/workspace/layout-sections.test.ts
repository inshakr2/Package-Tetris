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
    assert.equal(getWorkspaceSectionTitle("space"), "1. 적재 공간 선택");
    assert.equal(getWorkspaceSectionTitle("blocks"), "2. 박스 등록");
    assert.equal(getWorkspaceSectionTitle("review"), "3. 실행 전 확인");
    assert.equal(getWorkspaceSectionTitle("result"), "4. 결과 확인");
  });
});
