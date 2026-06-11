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
  const existingTemplates = [
    {
      blockTemplateId: "template-speaker",
      name: "KMS-210 스피커 박스",
      dimensions: { widthMm: 420, depthMm: 360, heightMm: 520 },
      fragile: false,
      weightKg: 18.5,
      group1: "금영",
      group2: "스피커"
    },
    {
      blockTemplateId: "template-amp",
      name: "EG-AMP 조합 박스",
      dimensions: { widthMm: 500, depthMm: 410, heightMm: 220 },
      fragile: true,
      weightKg: null,
      group1: "엔터그레인",
      group2: "앰프"
    }
  ];

  it("현재 작업용 .xlsx 행은 저장된 박스명, 작업수량, 아래층우선타입만 받아 미리보기 후보로 변환한다", () => {
    // Given
    const rows = [
      DRAFT_BLOCK_XLSX_COLUMNS,
      ["KMS-210 스피커 박스", 12, 2],
      ["EG-AMP 조합 박스", "4", "3"]
    ];

    // When
    const preview = createDraftBlockImportPreview(rows, { existingTemplates });

    // Then
    assert.equal(preview.canImport, true);
    assert.deepEqual(preview.errors, []);
    assert.deepEqual(
      preview.rows.map((row) => ({
        rowNumber: row.rowNumber,
        blockTemplateId: row.blockTemplateId,
        name: row.name,
        quantity: row.quantity,
        loadPriority: row.loadPriority,
        fragile: row.fragile,
        weightKg: row.weightKg
      })),
      [
        {
          rowNumber: 2,
          blockTemplateId: "template-speaker",
          name: "KMS-210 스피커 박스",
          quantity: 12,
          loadPriority: 5,
          fragile: false,
          weightKg: 18.5
        },
        {
          rowNumber: 3,
          blockTemplateId: "template-amp",
          name: "EG-AMP 조합 박스",
          quantity: 4,
          loadPriority: 10,
          fragile: true,
          weightKg: null
        }
      ]
    );
  });

  it("컬럼 순서가 달라도 헤더 이름을 기준으로 현재 작업 값을 해석한다", () => {
    // Given
    const rows = [
      ["아래층우선타입", "박스명", "작업수량"],
      [3, "EG-AMP 조합 박스", 7]
    ];

    // When
    const preview = createDraftBlockImportPreview(rows, { existingTemplates });

    // Then
    assert.equal(preview.canImport, true);
    assert.deepEqual(preview.errors, []);
    assert.deepEqual(
      preview.rows.map((row) => ({
        rowNumber: row.rowNumber,
        blockTemplateId: row.blockTemplateId,
        name: row.name,
        quantity: row.quantity,
        loadPriority: row.loadPriority
      })),
      [
        {
          rowNumber: 2,
          blockTemplateId: "template-amp",
          name: "EG-AMP 조합 박스",
          quantity: 7,
          loadPriority: 10
        }
      ]
    );
  });

  it("수량 오류, 아래층 우선 타입 오류, 저장되지 않은 박스명은 행 번호와 사유를 반환한다", () => {
    // Given
    const rows = [
      DRAFT_BLOCK_XLSX_COLUMNS,
      ["KMS-210 스피커 박스", 0, 1],
      ["KMS-210 스피커 박스", 2, "먼저 바닥에"],
      ["저장 안 된 박스", 2, 2]
    ];

    // When
    const preview = createDraftBlockImportPreview(rows, { existingTemplates });

    // Then
    assert.equal(preview.canImport, false);
    assert.deepEqual(
      preview.errors.map((error) => [error.rowNumber, error.field, error.message]),
      [
        [2, "작업수량", "작업수량은 1 이상의 정수여야 합니다."],
        [3, "아래층우선타입", "아래층우선타입은 1(기본), 2(먼저바닥에), 3(맨아래우선) 중 하나로 입력해 주세요."],
        [4, "박스명", "저장된 박스에 없는 박스명입니다. 먼저 박스 등록에서 저장해 주세요."]
      ]
    );
    assert.equal(preview.rows.length, 0);
  });

  it("빈 sheet, 알 수 없는 컬럼, 중복 컬럼, prototype pollution 컬럼은 workbook 오류로 거부한다", () => {
    // Given
    const emptyRows: unknown[][] = [];
    const unknownColumnRows = [["박스명", "작업수량", "아래층우선타입", "비고"]];
    const duplicateColumnRows = [["박스명", "박스명", "작업수량", "아래층우선타입"]];
    const unsafeColumnRows = [["박스명", "작업수량", "__proto__"]];

    // When
    const emptyPreview = createDraftBlockImportPreview(emptyRows, { existingTemplates });
    const unknownColumnPreview = createDraftBlockImportPreview(unknownColumnRows, { existingTemplates });
    const duplicateColumnPreview = createDraftBlockImportPreview(duplicateColumnRows, { existingTemplates });
    const unsafeColumnPreview = createDraftBlockImportPreview(unsafeColumnRows, { existingTemplates });

    // Then
    assert.deepEqual(emptyPreview.errors.map((error) => error.message), ["첫 번째 sheet가 비어 있습니다."]);
    assert.deepEqual(unknownColumnPreview.errors.map((error) => error.message), ["알 수 없는 컬럼이 있습니다: 비고"]);
    assert.deepEqual(duplicateColumnPreview.errors.map((error) => error.message), ["중복된 컬럼이 있습니다: 박스명"]);
    assert.deepEqual(unsafeColumnPreview.errors.map((error) => error.message), ["허용되지 않는 컬럼명이 있습니다: __proto__"]);
    assert.equal(emptyPreview.canImport, false);
    assert.equal(unknownColumnPreview.canImport, false);
    assert.equal(duplicateColumnPreview.canImport, false);
    assert.equal(unsafeColumnPreview.canImport, false);
  });

  it("현장 사용자가 내려받는 현재 작업 샘플 .xlsx는 미리보기에서 그대로 읽힌다", async () => {
    // Given
    const sample = createDraftBlockImportSampleWorkbook();

    // When
    const sheetRows = await readSheet(Buffer.from(sample.bytes));
    const preview = createDraftBlockImportPreview(sheetRows, { existingTemplates });

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
