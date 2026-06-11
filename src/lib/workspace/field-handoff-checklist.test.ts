import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFieldHandoffChecklist } from "./field-handoff-checklist";

describe("field-handoff-checklist", () => {
  it("결과가 없으면 결과 만들기를 첫 확인 항목으로 안내한다", () => {
    // Given
    const input = {
      hasResult: false,
      resultFreshnessStatus: "fresh" as const,
      resultActionDisabled: false,
      unloadedBlockCount: 0,
      warningCount: 0,
      needsExport: false
    };

    // When
    const checklist = createFieldHandoffChecklist(input);

    // Then
    assert.equal(checklist.title, "현장 전달 준비 중");
    assert.equal(checklist.tone, "waiting");
    assert.deepEqual(
      checklist.items.map((item) => [item.id, item.status, item.action] as const),
      [
        ["result", "waiting", "create-result"],
        ["inspection", "waiting", null],
        ["safety", "waiting", null],
        ["backup", "waiting", null]
      ]
    );
    assert.equal(checklist.items[3]?.description, "결과를 만든 뒤 백업 파일을 만들 수 있습니다.");
  });

  it("입력이 바뀐 결과와 경고, 백업 필요 상태를 현장 확인 항목으로 묶는다", () => {
    // Given
    const input = {
      hasResult: true,
      resultFreshnessStatus: "stale" as const,
      resultActionDisabled: false,
      unloadedBlockCount: 2,
      warningCount: 3,
      needsExport: true
    };

    // When
    const checklist = createFieldHandoffChecklist(input);

    // Then
    assert.equal(checklist.title, "확인 후 현장 전달");
    assert.equal(checklist.tone, "attention");
    assert.deepEqual(
      checklist.items.map((item) => [item.id, item.status, item.action] as const),
      [
        ["result", "attention", "recalculate"],
        ["inspection", "review", null],
        ["safety", "attention", null],
        ["backup", "attention", "export-backup"]
      ]
    );
  });

  it("최신 결과와 백업이 준비되면 전달 가능 상태로 두되 3D와 공간 확인은 중립 확인 항목으로 남긴다", () => {
    // Given
    const input = {
      hasResult: true,
      resultFreshnessStatus: "fresh" as const,
      resultActionDisabled: false,
      unloadedBlockCount: 0,
      warningCount: 0,
      needsExport: false
    };

    // When
    const checklist = createFieldHandoffChecklist(input);

    // Then
    assert.equal(checklist.title, "현장 전달 준비됨");
    assert.equal(checklist.tone, "ready");
    assert.deepEqual(
      checklist.items.map((item) => [item.id, item.status, item.action] as const),
      [
        ["result", "ready", null],
        ["inspection", "review", null],
        ["safety", "ready", null],
        ["backup", "ready", null]
      ]
    );
    assert.deepEqual(
      checklist.items.map((item) => item.label),
      ["최신 결과", "3D와 공간 확인", "미적재 없음", "백업 상태"]
    );
    assert.equal(checklist.items[1]?.description.includes("미적재"), false);
    assert.equal(checklist.items[3]?.description, "현재 결과 기준 백업 파일을 만들었습니다.");
  });
});
