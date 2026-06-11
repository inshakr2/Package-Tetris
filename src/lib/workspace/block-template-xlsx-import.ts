import type { Dimensions } from "./types";

export const BLOCK_TEMPLATE_XLSX_COLUMNS = [
  "상위그룹",
  "하위그룹",
  "박스명",
  "가로mm",
  "세로mm",
  "높이mm",
  "무게kg",
  "깨짐주의"
] as const;

const REQUIRED_DIMENSION_COLUMNS = ["가로mm", "세로mm", "높이mm"] as const;
const UNSAFE_COLUMN_NAMES = new Set(["__proto__", "prototype", "constructor"]);
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type BlockTemplateXlsxColumn = (typeof BLOCK_TEMPLATE_XLSX_COLUMNS)[number];
type ImportRowByColumn = Record<BlockTemplateXlsxColumn, unknown>;

export interface BlockTemplateImportCandidate {
  rowNumber: number;
  group1?: string;
  group2?: string;
  name: string;
  dimensions: Dimensions;
  weightKg: number | null;
  fragile: boolean;
}

export interface BlockTemplateImportError {
  rowNumber?: number;
  field?: string;
  message: string;
}

export interface BlockTemplateImportPreview {
  rows: BlockTemplateImportCandidate[];
  errors: BlockTemplateImportError[];
  canImport: boolean;
}

interface BlockTemplateImportPreviewOptions {
  existingTemplateNames?: string[];
}

interface BlockTemplateImportFileLike {
  name: string;
  type?: string;
}

export function isSupportedBlockTemplateImportFile(file: BlockTemplateImportFileLike) {
  const fileName = file.name.trim().toLocaleLowerCase("ko-KR");

  if (!fileName.endsWith(".xlsx")) {
    return false;
  }

  if (fileName.endsWith(".xlsx.exe")) {
    return false;
  }

  return !file.type || file.type === XLSX_MIME_TYPE || file.type === "application/octet-stream";
}

export async function readBlockTemplateXlsxFile(
  file: Blob & BlockTemplateImportFileLike,
  options: BlockTemplateImportPreviewOptions = {}
) {
  if (!isSupportedBlockTemplateImportFile(file)) {
    return {
      rows: [],
      errors: [{ message: ".xlsx 파일만 가져올 수 있습니다." }],
      canImport: false
    };
  }

  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);

  return createBlockTemplateImportPreview(rows, options);
}

export function createBlockTemplateImportPreview(
  rawRows: readonly (readonly unknown[])[],
  options: BlockTemplateImportPreviewOptions = {}
): BlockTemplateImportPreview {
  if (rawRows.length === 0) {
    return createRejectedPreview("첫 번째 sheet가 비어 있습니다.");
  }

  const [headerRow, ...bodyRows] = rawRows;
  const headerValidation = validateHeaderRow(headerRow ?? []);

  if (headerValidation) {
    return createRejectedPreview(headerValidation);
  }

  const existingNames = new Set(
    (options.existingTemplateNames ?? []).map((name) => normalizeDuplicateKey(name))
  );
  const namesInFile = new Set<string>();
  const rows: BlockTemplateImportCandidate[] = [];
  const errors: BlockTemplateImportError[] = [];

  for (const [bodyIndex, rawRow] of bodyRows.entries()) {
    const rowNumber = bodyIndex + 2;

    if (isEmptyRow(rawRow)) {
      continue;
    }

    const parsed = parseImportRow(createRowByColumn(rawRow), rowNumber, existingNames, namesInFile);

    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors);
      continue;
    }

    if (parsed.row) {
      rows.push(parsed.row);
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ message: "첫 번째 sheet에 가져올 박스 행이 없습니다." });
  }

  return {
    rows,
    errors,
    canImport: rows.length > 0 && errors.length === 0
  };
}

function validateHeaderRow(headerRow: readonly unknown[]) {
  if (isEmptyRow(headerRow)) {
    return "첫 번째 sheet가 비어 있습니다.";
  }

  const headers = headerRow.map((cell) => normalizeText(cell));
  const unsafeColumns = headers.filter((header) => UNSAFE_COLUMN_NAMES.has(header));

  if (unsafeColumns.length > 0) {
    return `허용되지 않는 컬럼명이 있습니다: ${unsafeColumns.join(", ")}`;
  }

  const expectedColumns = new Set<string>(BLOCK_TEMPLATE_XLSX_COLUMNS);
  const unknownColumns = headers.filter((header) => header && !expectedColumns.has(header));

  if (unknownColumns.length > 0) {
    return `알 수 없는 컬럼이 있습니다: ${unknownColumns.join(", ")}`;
  }

  const missingColumns = BLOCK_TEMPLATE_XLSX_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    return `필수 컬럼이 없습니다: ${missingColumns.join(", ")}`;
  }

  return null;
}

function parseImportRow(
  row: ImportRowByColumn,
  rowNumber: number,
  existingNames: Set<string>,
  namesInFile: Set<string>
) {
  const errors: BlockTemplateImportError[] = [];
  const name = normalizeText(row["박스명"]);
  const group1 = normalizeText(row["상위그룹"]);
  const group2 = normalizeText(row["하위그룹"]);
  const duplicateKey = normalizeDuplicateKey(name);

  if (!name) {
    errors.push({ rowNumber, field: "박스명", message: "박스명을 입력해 주세요." });
  } else if (existingNames.has(duplicateKey)) {
    errors.push({ rowNumber, field: "박스명", message: "이미 저장된 박스명입니다." });
  } else if (namesInFile.has(duplicateKey)) {
    errors.push({ rowNumber, field: "박스명", message: "같은 파일 안에서 중복된 박스명입니다." });
  } else {
    namesInFile.add(duplicateKey);
  }

  if (group2 && !group1) {
    errors.push({ rowNumber, field: "상위그룹", message: "하위그룹을 쓰려면 상위그룹도 입력해 주세요." });
  }

  const dimensions = parseDimensions(row, rowNumber, errors);
  const weightKg = parseWeight(row["무게kg"], rowNumber, errors);
  const fragile = parseFragile(row["깨짐주의"], rowNumber, errors);

  if (errors.length > 0 || !dimensions || fragile === null) {
    return { row: null, errors };
  }

  return {
    row: {
      rowNumber,
      group1: group1 || undefined,
      group2: group2 || undefined,
      name,
      dimensions,
      weightKg,
      fragile
    },
    errors
  };
}

function parseDimensions(
  row: ImportRowByColumn,
  rowNumber: number,
  errors: BlockTemplateImportError[]
) {
  const parsedValues = REQUIRED_DIMENSION_COLUMNS.map((column) => ({
    column,
    value: parsePositiveInteger(row[column])
  }));

  for (const parsed of parsedValues) {
    if (parsed.value === null) {
      errors.push({
        rowNumber,
        field: parsed.column,
        message: `${parsed.column}는 1 이상의 정수여야 합니다.`
      });
    }
  }

  if (parsedValues.some((parsed) => parsed.value === null)) {
    return null;
  }

  const [widthMm, depthMm, heightMm] = parsedValues.map((parsed) => parsed.value);

  if (widthMm === null || depthMm === null || heightMm === null) {
    return null;
  }

  return {
    widthMm,
    depthMm,
    heightMm
  } satisfies Dimensions;
}

function parseWeight(value: unknown, rowNumber: number, errors: BlockTemplateImportError[]) {
  if (isBlank(value)) {
    return null;
  }

  const parsed = parseNumber(value);

  if (parsed === null || parsed < 0) {
    errors.push({
      rowNumber,
      field: "무게kg",
      message: "무게kg는 비워 두거나 0 이상의 숫자여야 합니다."
    });
    return null;
  }

  return parsed;
}

function parseFragile(value: unknown, rowNumber: number, errors: BlockTemplateImportError[]) {
  if (isBlank(value)) {
    return false;
  }

  const normalized = normalizeText(value).toLocaleLowerCase("ko-KR");
  const truthyValues = new Set(["1", "true", "y", "yes", "o", "예", "네", "깨짐주의"]);
  const falsyValues = new Set(["0", "false", "n", "no", "x", "아니오", "아니요", "일반"]);

  if (truthyValues.has(normalized)) {
    return true;
  }

  if (falsyValues.has(normalized)) {
    return false;
  }

  errors.push({
    rowNumber,
    field: "깨짐주의",
    message: "깨짐주의는 예/아니오로 입력해 주세요."
  });
  return null;
}

function createRowByColumn(rawRow: readonly unknown[]) {
  return BLOCK_TEMPLATE_XLSX_COLUMNS.reduce((row, column, index) => {
    row[column] = rawRow[index];
    return row;
  }, {} as ImportRowByColumn);
}

function createRejectedPreview(message: string): BlockTemplateImportPreview {
  return {
    rows: [],
    errors: [{ message }],
    canImport: false
  };
}

function isEmptyRow(row: readonly unknown[]) {
  return row.every((cell) => isBlank(cell));
}

function isBlank(value: unknown) {
  return value === null || value === undefined || normalizeText(value) === "";
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDuplicateKey(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function parsePositiveInteger(value: unknown) {
  const parsed = parseNumber(value);

  if (parsed === null || parsed < 1 || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = normalizeText(value).replace(/,/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}
