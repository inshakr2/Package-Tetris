import type { Dimensions } from "./types";
import {
  XLSX_MIME_TYPE,
  createXlsxWorkbookFromRows,
  isSupportedBlockTemplateImportFile
} from "./block-template-xlsx-import";
import { normalizeLoadPriorityScore, type LoadPriorityValue } from "./load-priority";

export const DRAFT_BLOCK_XLSX_COLUMNS = [
  "상위그룹",
  "하위그룹",
  "박스명",
  "가로mm",
  "세로mm",
  "높이mm",
  "무게kg",
  "깨짐주의",
  "수량",
  "아래층우선"
] as const;

export const DRAFT_BLOCK_IMPORT_SAMPLE_ROWS = [
  ["금영", "스피커", "KMS-210 스피커 박스", "420", "360", "520", "18.5", "아니오", "12", "먼저 바닥에"],
  ["엔터그레인", "앰프", "EG-AMP 조합 박스", "500", "410", "220", "", "예", "4", "맨 아래 우선"]
] as const;

export const DRAFT_BLOCK_IMPORT_SAMPLE_FILE_NAME = "package-tetris-current-work-sample.xlsx";

const REQUIRED_DIMENSION_COLUMNS = ["가로mm", "세로mm", "높이mm"] as const;
const UNSAFE_COLUMN_NAMES = new Set(["__proto__", "prototype", "constructor"]);

type DraftBlockXlsxColumn = (typeof DRAFT_BLOCK_XLSX_COLUMNS)[number];
type ImportRowByColumn = Record<DraftBlockXlsxColumn, unknown>;

export interface ExistingDraftBlockTemplate {
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
}

export interface DraftBlockImportCandidate {
  rowNumber: number;
  group1?: string;
  group2?: string;
  name: string;
  dimensions: Dimensions;
  weightKg: number | null;
  fragile: boolean;
  quantity: number;
  loadPriority: LoadPriorityValue;
}

export interface DraftBlockImportError {
  rowNumber?: number;
  field?: string;
  message: string;
}

export interface DraftBlockImportPreview {
  rows: DraftBlockImportCandidate[];
  errors: DraftBlockImportError[];
  canImport: boolean;
}

interface DraftBlockImportPreviewOptions {
  existingTemplates?: readonly ExistingDraftBlockTemplate[];
}

interface DraftBlockImportFileLike {
  name: string;
  type?: string;
}

export interface DraftBlockImportSampleWorkbook {
  fileName: string;
  mimeType: typeof XLSX_MIME_TYPE;
  bytes: Uint8Array<ArrayBuffer>;
}

export async function readDraftBlockXlsxFile(
  file: Blob & DraftBlockImportFileLike,
  options: DraftBlockImportPreviewOptions = {}
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

  return createDraftBlockImportPreview(rows, options);
}

export function createDraftBlockImportSampleWorkbook(): DraftBlockImportSampleWorkbook {
  const rows = [
    Array.from(DRAFT_BLOCK_XLSX_COLUMNS),
    ...DRAFT_BLOCK_IMPORT_SAMPLE_ROWS.map((row) => Array.from(row))
  ];

  return {
    fileName: DRAFT_BLOCK_IMPORT_SAMPLE_FILE_NAME,
    mimeType: XLSX_MIME_TYPE,
    bytes: createXlsxWorkbookFromRows(rows)
  };
}

export function createDraftBlockImportPreview(
  rawRows: readonly (readonly unknown[])[],
  options: DraftBlockImportPreviewOptions = {}
): DraftBlockImportPreview {
  if (rawRows.length === 0) {
    return createRejectedPreview("첫 번째 sheet가 비어 있습니다.");
  }

  const [headerRow, ...bodyRows] = rawRows;
  const headerValidation = validateHeaderRow(headerRow ?? []);

  if (headerValidation) {
    return createRejectedPreview(headerValidation);
  }

  const existingTemplateByName = new Map(
    (options.existingTemplates ?? []).map((template) => [normalizeDuplicateKey(template.name), template])
  );
  const rowsInFile = new Map<string, Pick<DraftBlockImportCandidate, "dimensions" | "fragile">>();
  const rows: DraftBlockImportCandidate[] = [];
  const errors: DraftBlockImportError[] = [];

  for (const [bodyIndex, rawRow] of bodyRows.entries()) {
    const rowNumber = bodyIndex + 2;

    if (isEmptyRow(rawRow)) {
      continue;
    }

    const parsed = parseImportRow(createRowByColumn(rawRow), rowNumber, existingTemplateByName, rowsInFile);

    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors);
      continue;
    }

    if (parsed.row) {
      rows.push(parsed.row);
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ message: "첫 번째 sheet에 현재 작업에 추가할 박스 행이 없습니다." });
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

  const expectedColumns = new Set<string>(DRAFT_BLOCK_XLSX_COLUMNS);
  const unknownColumns = headers.filter((header) => header && !expectedColumns.has(header));

  if (unknownColumns.length > 0) {
    return `알 수 없는 컬럼이 있습니다: ${unknownColumns.join(", ")}`;
  }

  const missingColumns = DRAFT_BLOCK_XLSX_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    return `필수 컬럼이 없습니다: ${missingColumns.join(", ")}`;
  }

  return null;
}

function parseImportRow(
  row: ImportRowByColumn,
  rowNumber: number,
  existingTemplateByName: Map<string, ExistingDraftBlockTemplate>,
  rowsInFile: Map<string, Pick<DraftBlockImportCandidate, "dimensions" | "fragile">>
) {
  const errors: DraftBlockImportError[] = [];
  const name = normalizeText(row["박스명"]);
  const group1 = normalizeText(row["상위그룹"]);
  const group2 = normalizeText(row["하위그룹"]);

  if (!name) {
    errors.push({ rowNumber, field: "박스명", message: "박스명을 입력해 주세요." });
  }

  if (group2 && !group1) {
    errors.push({ rowNumber, field: "상위그룹", message: "하위그룹을 쓰려면 상위그룹도 입력해 주세요." });
  }

  const dimensions = parseDimensions(row, rowNumber, errors);
  const weightKg = parseWeight(row["무게kg"], rowNumber, errors);
  const fragile = parseFragile(row["깨짐주의"], rowNumber, errors);
  const quantity = parseQuantity(row["수량"], rowNumber, errors);
  const loadPriority = parseLoadPriority(row["아래층우선"], rowNumber, errors);

  if (!name || errors.length > 0 || !dimensions || fragile === null || quantity === null || loadPriority === null) {
    return { row: null, errors };
  }

  const duplicateKey = normalizeDuplicateKey(name);
  const existingTemplate = existingTemplateByName.get(duplicateKey);
  const rowSignature = rowsInFile.get(duplicateKey);

  if (existingTemplate && !isSameBlockShape(existingTemplate, dimensions, fragile)) {
    return {
      row: null,
      errors: [
        ...errors,
        { rowNumber, field: "박스명", message: "저장된 박스와 치수 또는 깨짐주의 값이 다릅니다." }
      ]
    };
  }

  if (rowSignature && !isSameBlockShape(rowSignature, dimensions, fragile)) {
    return {
      row: null,
      errors: [
        ...errors,
        { rowNumber, field: "박스명", message: "같은 파일 안의 동일 박스명과 치수 또는 깨짐주의 값이 다릅니다." }
      ]
    };
  }

  rowsInFile.set(duplicateKey, { dimensions, fragile });

  return {
    row: {
      rowNumber,
      group1: group1 || undefined,
      group2: group2 || undefined,
      name,
      dimensions,
      weightKg,
      fragile,
      quantity,
      loadPriority
    },
    errors
  };
}

function parseDimensions(
  row: ImportRowByColumn,
  rowNumber: number,
  errors: DraftBlockImportError[]
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

function parseWeight(value: unknown, rowNumber: number, errors: DraftBlockImportError[]) {
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

function parseFragile(value: unknown, rowNumber: number, errors: DraftBlockImportError[]) {
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

function parseQuantity(value: unknown, rowNumber: number, errors: DraftBlockImportError[]) {
  const quantity = parsePositiveInteger(value);

  if (quantity === null) {
    errors.push({
      rowNumber,
      field: "수량",
      message: "수량은 1 이상의 정수여야 합니다."
    });
  }

  return quantity;
}

function parseLoadPriority(value: unknown, rowNumber: number, errors: DraftBlockImportError[]) {
  if (isBlank(value)) {
    return 0;
  }

  const normalized = normalizeText(value).toLocaleLowerCase("ko-KR");
  const compact = normalized.replace(/\s/g, "");
  const explicitValue = parseNumber(value);

  if (explicitValue !== null) {
    if (explicitValue === 0 || explicitValue === 5 || explicitValue === 10) {
      return normalizeLoadPriorityScore(explicitValue);
    }

    errors.push(createLoadPriorityError(rowNumber));
    return null;
  }

  if (normalized === "기본" || compact === "없음") {
    return 0;
  }

  if (normalized === "먼저 바닥에" || normalized === "먼저" || compact === "바닥우선") {
    return 5;
  }

  if (
    normalized === "맨 아래 우선" ||
    normalized === "최우선" ||
    normalized === "가장 먼저" ||
    compact === "맨아래우선"
  ) {
    return 10;
  }

  errors.push(createLoadPriorityError(rowNumber));
  return null;
}

function createLoadPriorityError(rowNumber: number) {
  return {
    rowNumber,
    field: "아래층우선",
    message: "아래층우선은 기본/먼저 바닥에/맨 아래 우선 중 하나로 입력해 주세요."
  };
}

function createRowByColumn(rawRow: readonly unknown[]) {
  return DRAFT_BLOCK_XLSX_COLUMNS.reduce((row, column, index) => {
    row[column] = rawRow[index];
    return row;
  }, {} as ImportRowByColumn);
}

function createRejectedPreview(message: string): DraftBlockImportPreview {
  return {
    rows: [],
    errors: [{ message }],
    canImport: false
  };
}

function isSameBlockShape(
  template: Pick<DraftBlockImportCandidate, "dimensions" | "fragile">,
  dimensions: Dimensions,
  fragile: boolean
) {
  return (
    template.fragile === fragile &&
    template.dimensions.widthMm === dimensions.widthMm &&
    template.dimensions.depthMm === dimensions.depthMm &&
    template.dimensions.heightMm === dimensions.heightMm
  );
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
