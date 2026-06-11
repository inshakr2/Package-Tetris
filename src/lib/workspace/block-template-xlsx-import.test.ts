import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOCK_TEMPLATE_XLSX_COLUMNS,
  BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS,
  createBlockTemplateImportSampleWorkbook,
  createBlockTemplateImportPreview,
  isSupportedBlockTemplateImportFile
} from "./block-template-xlsx-import";
import { readSheet } from "read-excel-file/node";

describe("block-template-xlsx-import", () => {
  it("정해진 컬럼의 첫 번째 sheet 행을 저장 전 미리보기 후보로 변환한다", () => {
    // Given
    const rows = [
      BLOCK_TEMPLATE_XLSX_COLUMNS,
      ["금영", "스피커", "K-스피커 박스", 420, 360, 280, 12.5, "예"],
      ["엔터그레인", "앰프", "E-앰프 박스", "430", "370", "290", "", "아니오"]
    ];

    // When
    const preview = createBlockTemplateImportPreview(rows);

    // Then
    assert.equal(preview.canImport, true);
    assert.deepEqual(preview.errors, []);
    assert.equal(preview.rows.length, 2);
    assert.deepEqual(preview.rows[0], {
      rowNumber: 2,
      group1: "금영",
      group2: "스피커",
      name: "K-스피커 박스",
      dimensions: { widthMm: 420, depthMm: 360, heightMm: 280 },
      weightKg: 12.5,
      fragile: true
    });
    assert.deepEqual(preview.rows[1], {
      rowNumber: 3,
      group1: "엔터그레인",
      group2: "앰프",
      name: "E-앰프 박스",
      dimensions: { widthMm: 430, depthMm: 370, heightMm: 290 },
      weightKg: null,
      fragile: false
    });
  });

  it("컬럼 순서가 달라도 헤더 이름을 기준으로 저장 박스 값을 해석한다", () => {
    // Given
    const rows = [
      ["박스명", "깨짐주의", "가로mm", "높이mm", "세로mm", "무게kg", "하위그룹", "상위그룹"],
      ["순서 변경 박스", "예", 610, 330, 420, 8.75, "스피커", "금영"]
    ];

    // When
    const preview = createBlockTemplateImportPreview(rows);

    // Then
    assert.equal(preview.canImport, true);
    assert.deepEqual(preview.errors, []);
    assert.deepEqual(preview.rows[0], {
      rowNumber: 2,
      group1: "금영",
      group2: "스피커",
      name: "순서 변경 박스",
      dimensions: { widthMm: 610, depthMm: 420, heightMm: 330 },
      weightKg: 8.75,
      fragile: true
    });
  });

  it("필수값 누락, 숫자 오류, 중복 박스명은 행 번호와 사유로 반환하고 저장 후보에서 제외한다", () => {
    // Given
    const rows = [
      BLOCK_TEMPLATE_XLSX_COLUMNS,
      ["금영", "스피커", "", 420, 360, 280, 12.5, "예"],
      ["금영", "스피커", "치수 오류 박스", 0, 360, 280, 12.5, "예"],
      ["금영", "스피커", "기존 박스", 420, 360, 280, 12.5, "예"],
      ["금영", "스피커", "새 박스", 420, 360, 280, "무거움", "예"],
      ["금영", "스피커", "새 박스", 420, 360, 280, 12.5, "예"]
    ];

    // When
    const preview = createBlockTemplateImportPreview(rows, {
      existingTemplateNames: ["기존 박스"]
    });

    // Then
    assert.equal(preview.canImport, false);
    assert.deepEqual(
      preview.errors.map((error) => [error.rowNumber, error.field, error.message]),
      [
        [2, "박스명", "박스명을 입력해 주세요."],
        [3, "가로mm", "가로mm는 1 이상의 정수여야 합니다."],
        [4, "박스명", "이미 저장된 박스명입니다."],
        [5, "무게kg", "무게kg는 비워 두거나 0 이상의 숫자여야 합니다."],
        [6, "박스명", "같은 파일 안에서 중복된 박스명입니다."]
      ]
    );
    assert.equal(preview.rows.length, 0);
  });

  it("빈 sheet, 알 수 없는 컬럼, 중복 컬럼, prototype pollution 컬럼은 workbook 오류로 거부한다", () => {
    // Given
    const emptyRows: unknown[][] = [];
    const unknownColumnRows = [["상위그룹", "하위그룹", "박스명", "가로mm", "세로mm", "높이mm", "무게kg", "깨짐주의", "비고"]];
    const duplicateColumnRows = [["상위그룹", "하위그룹", "박스명", "박스명", "가로mm", "세로mm", "높이mm", "무게kg", "깨짐주의"]];
    const unsafeColumnRows = [["상위그룹", "하위그룹", "박스명", "가로mm", "세로mm", "높이mm", "무게kg", "__proto__"]];

    // When
    const emptyPreview = createBlockTemplateImportPreview(emptyRows);
    const unknownColumnPreview = createBlockTemplateImportPreview(unknownColumnRows);
    const duplicateColumnPreview = createBlockTemplateImportPreview(duplicateColumnRows);
    const unsafeColumnPreview = createBlockTemplateImportPreview(unsafeColumnRows);

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

  it(".xlsx 파일만 일괄등록 대상으로 허용한다", () => {
    // Given
    const xlsxFile = {
      name: "박스_일괄등록.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
    const oldExcelFile = { name: "박스_일괄등록.xls", type: "application/vnd.ms-excel" };
    const disguisedFile = { name: "박스_일괄등록.xlsx.exe", type: "application/octet-stream" };

    // When / Then
    assert.equal(isSupportedBlockTemplateImportFile(xlsxFile), true);
    assert.equal(isSupportedBlockTemplateImportFile(oldExcelFile), false);
    assert.equal(isSupportedBlockTemplateImportFile(disguisedFile), false);
  });

  it("현장 사용자가 내려받는 샘플 .xlsx는 일괄등록 미리보기에서 그대로 읽힌다", async () => {
    // Given
    const sample = createBlockTemplateImportSampleWorkbook();

    // When
    const sheetRows = await readSheet(Buffer.from(sample.bytes));
    const preview = createBlockTemplateImportPreview(sheetRows);

    // Then
    assert.equal(sample.fileName, "package-tetris-box-import-sample.xlsx");
    assert.equal(sample.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.deepEqual(sheetRows[0], Array.from(BLOCK_TEMPLATE_XLSX_COLUMNS));
    assert.deepEqual(
      sheetRows.slice(1).map((row) => row.map((cell) => cell ?? "")),
      BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS.map((row) => Array.from(row))
    );
    assert.equal(preview.canImport, true);
    assert.equal(preview.rows.length, BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS.length);
  });
});
