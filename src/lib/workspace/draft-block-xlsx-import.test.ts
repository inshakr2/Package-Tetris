import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSheet } from "read-excel-file/node";
import {
  DRAFT_BLOCK_IMPORT_SAMPLE_ROWS,
  DRAFT_BLOCK_XLSX_COLUMNS,
  createDraftBlockImportPreview,
  createDraftBlockImportSampleWorkbook
} from "./draft-block-xlsx-import";

describe("draft-block-xlsx-import", () => {
  it("현재 작업용 .xlsx 행을 수량과 아래층 우선 조건이 있는 미리보기 후보로 변환한다", () => {
    // Given
    const rows = [
      DRAFT_BLOCK_XLSX_COLUMNS,
      ["금영", "스피커", "KMS-210 스피커 박스", 420, 360, 520, 18.5, "아니오", 12, "먼저 바닥에"],
      ["엔터그레인", "앰프", "EG-AMP 조합 박스", 500, 410, 220, "", "예", "4", "맨 아래 우선"]
    ];

    // When
    const preview = createDraftBlockImportPreview(rows);

    // Then
    assert.equal(preview.canImport, true);
    assert.deepEqual(preview.errors, []);
    assert.deepEqual(
      preview.rows.map((row) => ({
        rowNumber: row.rowNumber,
        name: row.name,
        quantity: row.quantity,
        loadPriority: row.loadPriority,
        fragile: row.fragile,
        weightKg: row.weightKg
      })),
      [
        {
          rowNumber: 2,
          name: "KMS-210 스피커 박스",
          quantity: 12,
          loadPriority: 5,
          fragile: false,
          weightKg: 18.5
        },
        {
          rowNumber: 3,
          name: "EG-AMP 조합 박스",
          quantity: 4,
          loadPriority: 10,
          fragile: true,
          weightKg: null
        }
      ]
    );
  });

  it("수량 오류, 아래층 우선 오류, 저장된 박스와 치수가 다른 행은 행 번호와 사유를 반환한다", () => {
    // Given
    const rows = [
      DRAFT_BLOCK_XLSX_COLUMNS,
      ["금영", "스피커", "수량 오류 박스", 420, 360, 520, 18.5, "아니오", 0, "기본"],
      ["금영", "스피커", "우선 오류 박스", 420, 360, 520, 18.5, "아니오", 2, "아주 먼저"],
      ["금영", "스피커", "기존 박스", 421, 360, 520, 18.5, "아니오", 2, "먼저 바닥에"]
    ];

    // When
    const preview = createDraftBlockImportPreview(rows, {
      existingTemplates: [
        {
          name: "기존 박스",
          dimensions: { widthMm: 420, depthMm: 360, heightMm: 520 },
          fragile: false
        }
      ]
    });

    // Then
    assert.equal(preview.canImport, false);
    assert.deepEqual(
      preview.errors.map((error) => [error.rowNumber, error.field, error.message]),
      [
        [2, "수량", "수량은 1 이상의 정수여야 합니다."],
        [3, "아래층우선", "아래층우선은 기본/먼저 바닥에/맨 아래 우선 중 하나로 입력해 주세요."],
        [4, "박스명", "저장된 박스와 치수 또는 깨짐주의 값이 다릅니다."]
      ]
    );
    assert.equal(preview.rows.length, 0);
  });

  it("현장 사용자가 내려받는 현재 작업 샘플 .xlsx는 미리보기에서 그대로 읽힌다", async () => {
    // Given
    const sample = createDraftBlockImportSampleWorkbook();

    // When
    const sheetRows = await readSheet(Buffer.from(sample.bytes));
    const preview = createDraftBlockImportPreview(sheetRows);

    // Then
    assert.equal(sample.fileName, "package-tetris-current-work-sample.xlsx");
    assert.deepEqual(sheetRows[0], Array.from(DRAFT_BLOCK_XLSX_COLUMNS));
    assert.deepEqual(
      sheetRows.slice(1).map((row) => row.map((cell) => cell ?? "")),
      DRAFT_BLOCK_IMPORT_SAMPLE_ROWS.map((row) => Array.from(row))
    );
    assert.equal(preview.canImport, true);
    assert.equal(preview.rows.length, DRAFT_BLOCK_IMPORT_SAMPLE_ROWS.length);
  });
});
