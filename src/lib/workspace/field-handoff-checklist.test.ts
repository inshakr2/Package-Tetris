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
      instructionPrepared: false,
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
        ["safety", "waiting", null],
        ["instructions", "waiting", null],
        ["backup", "ready", null]
      ]
    );
  });

  it("입력이 바뀐 결과와 미전달 지시서, 백업 필요 상태를 현장 확인 항목으로 묶는다", () => {
    // Given
    const input = {
      hasResult: true,
      resultFreshnessStatus: "stale" as const,
      resultActionDisabled: false,
      unloadedBlockCount: 2,
      warningCount: 3,
      instructionPrepared: false,
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
        ["safety", "attention", null],
        ["instructions", "attention", "open-instructions"],
        ["backup", "attention", "export-backup"]
      ]
    );
  });

  it("최신 결과, 확인된 안전 안내, 준비된 지시서와 백업이면 전달 준비 완료로 표시한다", () => {
    // Given
    const input = {
      hasResult: true,
      resultFreshnessStatus: "fresh" as const,
      resultActionDisabled: false,
      unloadedBlockCount: 0,
      warningCount: 0,
      instructionPrepared: true,
      needsExport: false
    };

    // When
    const checklist = createFieldHandoffChecklist(input);

    // Then
    assert.equal(checklist.title, "현장 전달 준비됨");
    assert.equal(checklist.tone, "ready");
    assert.equal(checklist.items.every((item) => item.status === "ready"), true);
  });
});
