import type { Dimensions } from "./types";
import {
  XLSX_MIME_TYPE,
  createXlsxWorkbookFromRows,
  isSupportedBlockTemplateImportFile
} from "./block-template-xlsx-import";
import { normalizeLoadPriorityScore, type LoadPriorityValue } from "./load-priority";
import {
  createXlsxHeaderMapping,
  createXlsxRowByColumn,
  isEmptyXlsxRow,
  normalizeXlsxText,
  type XlsxHeaderMapping
} from "./xlsx-header-row";

export const DRAFT_BLOCK_XLSX_COLUMNS = [
  "박스명",
  "작업수량",
  "적재위치타입"
] as const;

const LEGACY_DRAFT_BLOCK_XLSX_COLUMNS = [
  "박스명",
  "작업수량",
  "아래층우선타입"
] as const;

export const DRAFT_BLOCK_IMPORT_SAMPLE_ROWS = [
  ["KMS-210 스피커 박스", "12", "2"],
  ["EG-AMP 조합 박스", "4", "2"]
] as const;

export const DRAFT_BLOCK_IMPORT_SAMPLE_FILE_NAME = "package-tetris-current-work-sample.xlsx";

type DraftBlockXlsxColumn = (typeof DRAFT_BLOCK_XLSX_COLUMNS)[number];
type LegacyDraftBlockXlsxColumn = (typeof LEGACY_DRAFT_BLOCK_XLSX_COLUMNS)[number];
type ImportRowByColumn = Record<DraftBlockXlsxColumn, unknown>;

type DraftBlockImportHeaderMapping =
  | {
      legacy: false;
      columns: typeof DRAFT_BLOCK_XLSX_COLUMNS;
      mapping: XlsxHeaderMapping<DraftBlockXlsxColumn>;
    }
  | {
      legacy: true;
      columns: typeof LEGACY_DRAFT_BLOCK_XLSX_COLUMNS;
      mapping: XlsxHeaderMapping<LegacyDraftBlockXlsxColumn>;
    };

export interface ExistingDraftBlockTemplate {
  blockTemplateId: string;
  name: string;
  dimensions: Dimensions;
  weightKg?: number | null;
  fragile: boolean;
  group1?: string;
  group2?: string;
}

export interface DraftBlockImportCandidate {
  rowNumber: number;
  blockTemplateId: string;
  group1?: string;
  group2?: string;
  name: string;
  dimensions: Dimensions;
  weightKg: number | null;
  fragile: boolean;
  quantity: number;
  loadPriority: LoadPriorityValue;
  mergeSummary?: DraftBlockImportMergeSummary;
  warnings?: string[];
}

export interface DraftBlockImportMergeSummary {
  baseQuantity: number;
  addedQuantity: number;
  mergedQuantity: number;
  mergedRowNumbers: number[];
  priorityConflict: boolean;
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
  const headerMapping = createDraftBlockImportHeaderMapping(headerRow ?? []);

  if (!headerMapping.ok) {
    return createRejectedPreview(headerMapping.message);
  }

  const existingTemplateByName = new Map(
    (options.existingTemplates ?? []).map((template) => [normalizeDuplicateKey(template.name), template])
  );
  const rows: DraftBlockImportCandidate[] = [];
  const errors: DraftBlockImportError[] = [];

  for (const [bodyIndex, rawRow] of bodyRows.entries()) {
    const rowNumber = bodyIndex + 2;

    if (isEmptyXlsxRow(rawRow)) {
      continue;
    }

    const rowByColumn = createDraftBlockImportRow(rawRow, headerMapping.mapping);
    const parsed = parseImportRow(rowByColumn, rowNumber, existingTemplateByName, headerMapping.mapping.legacy);

    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors);
      continue;
    }

    if (parsed.row) {
      mergeDraftBlockImportRow(rows, parsed.row);
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

function createDraftBlockImportHeaderMapping(headerRow: readonly unknown[]) {
  const headers = headerRow.map((cell) => normalizeText(cell));
  const useLegacyColumns = headers.includes("아래층우선타입") && !headers.includes("적재위치타입");

  if (useLegacyColumns) {
    const legacyMapping = createXlsxHeaderMapping(headerRow, LEGACY_DRAFT_BLOCK_XLSX_COLUMNS);

    if (!legacyMapping.ok) {
      return legacyMapping;
    }

    return {
      ok: true as const,
      mapping: {
        legacy: true as const,
        columns: LEGACY_DRAFT_BLOCK_XLSX_COLUMNS,
        mapping: legacyMapping.mapping
      }
    };
  }

  const currentMapping = createXlsxHeaderMapping(headerRow, DRAFT_BLOCK_XLSX_COLUMNS);

  if (!currentMapping.ok) {
    return currentMapping;
  }

  return {
    ok: true as const,
    mapping: {
      legacy: false as const,
      columns: DRAFT_BLOCK_XLSX_COLUMNS,
      mapping: currentMapping.mapping
    }
  };
}

function createDraftBlockImportRow(rawRow: readonly unknown[], headerMapping: DraftBlockImportHeaderMapping) {
  if (headerMapping.legacy) {
    const legacyRow = createXlsxRowByColumn(rawRow, headerMapping.columns, headerMapping.mapping);

    return {
      박스명: legacyRow["박스명"],
      작업수량: legacyRow["작업수량"],
      적재위치타입: legacyRow["아래층우선타입"]
    };
  }

  return createXlsxRowByColumn(rawRow, headerMapping.columns, headerMapping.mapping);
}

function mergeDraftBlockImportRow(rows: DraftBlockImportCandidate[], row: DraftBlockImportCandidate) {
  const existingIndex = rows.findIndex((candidate) => candidate.blockTemplateId === row.blockTemplateId);

  if (existingIndex === -1) {
    rows.push(row);
    return;
  }

  const existingRow = rows[existingIndex];

  if (!existingRow) {
    rows.push(row);
    return;
  }

  rows[existingIndex] = {
    ...existingRow,
    quantity: existingRow.quantity + row.quantity,
    mergeSummary: createDraftBlockMergeSummary(existingRow, row),
    warnings: createDraftBlockMergeWarnings(existingRow, row)
  };
}

function createDraftBlockMergeSummary(
  existingRow: DraftBlockImportCandidate,
  row: DraftBlockImportCandidate
): DraftBlockImportMergeSummary {
  const previousSummary = existingRow.mergeSummary;
  const baseQuantity = previousSummary?.baseQuantity ?? existingRow.quantity;
  const addedQuantity = (previousSummary?.addedQuantity ?? 0) + row.quantity;
  const mergedRowNumbers = previousSummary?.mergedRowNumbers ?? [existingRow.rowNumber];
  const priorityConflict = Boolean(previousSummary?.priorityConflict) || existingRow.loadPriority !== row.loadPriority;

  return {
    baseQuantity,
    addedQuantity,
    mergedQuantity: baseQuantity + addedQuantity,
    mergedRowNumbers: [...mergedRowNumbers, row.rowNumber],
    priorityConflict
  };
}

function createDraftBlockMergeWarnings(existingRow: DraftBlockImportCandidate, row: DraftBlockImportCandidate) {
  const warnings = [...(existingRow.warnings ?? [])];

  if (existingRow.loadPriority !== row.loadPriority) {
    warnings.push(`${row.rowNumber}행 적재위치타입은 첫 행의 기존 설정을 유지합니다.`);
  }

  return warnings;
}

function parseImportRow(
  row: ImportRowByColumn,
  rowNumber: number,
  existingTemplateByName: Map<string, ExistingDraftBlockTemplate>,
  legacyPriorityColumn: boolean
) {
  const errors: DraftBlockImportError[] = [];
  const name = normalizeText(row["박스명"]);

  if (!name) {
    errors.push({ rowNumber, field: "박스명", message: "박스명을 입력해 주세요." });
  }

  const quantity = parseQuantity(row["작업수량"], rowNumber, errors);
  const loadPriority = parseLoadPriorityType(row["적재위치타입"], rowNumber, errors, legacyPriorityColumn);

  if (!name || errors.length > 0 || quantity === null || loadPriority === null) {
    return { row: null, errors };
  }

  const duplicateKey = normalizeDuplicateKey(name);
  const existingTemplate = existingTemplateByName.get(duplicateKey);

  if (!existingTemplate) {
    return {
      row: null,
      errors: [
        ...errors,
        { rowNumber, field: "박스명", message: "저장된 박스에 없는 박스명입니다. 먼저 박스 등록에서 저장해 주세요." }
      ]
    };
  }

  return {
    row: {
      rowNumber,
      blockTemplateId: existingTemplate.blockTemplateId,
      group1: existingTemplate.group1,
      group2: existingTemplate.group2,
      name: existingTemplate.name,
      dimensions: existingTemplate.dimensions,
      weightKg: existingTemplate.weightKg ?? null,
      fragile: existingTemplate.fragile,
      quantity,
      loadPriority
    },
    errors
  };
}

function parseQuantity(value: unknown, rowNumber: number, errors: DraftBlockImportError[]) {
  const quantity = parsePositiveInteger(value);

  if (quantity === null) {
    errors.push({
      rowNumber,
      field: "작업수량",
      message: "작업수량은 1 이상의 정수여야 합니다."
    });
  }

  return quantity;
}

function parseLoadPriorityType(
  value: unknown,
  rowNumber: number,
  errors: DraftBlockImportError[],
  legacyPriorityColumn: boolean
) {
  const explicitValue = parseNumber(value);

  if (explicitValue === 1) {
    return 0;
  }

  if (explicitValue === 2 || (legacyPriorityColumn && explicitValue === 3)) {
    return normalizeLoadPriorityScore(5);
  }

  errors.push(createLoadPriorityError(rowNumber, legacyPriorityColumn));
  return null;
}

function createLoadPriorityError(rowNumber: number, legacyPriorityColumn: boolean) {
  if (legacyPriorityColumn) {
    return {
      rowNumber,
      field: "아래층우선타입",
      message: "아래층우선타입은 1(기본), 2(아래우선), 3(아래우선 레거시) 중 하나로 입력해 주세요."
    };
  }

  return {
    rowNumber,
    field: "적재위치타입",
    message: "적재위치타입은 1(기본), 2(아래우선) 중 하나로 입력해 주세요."
  };
}

function createRejectedPreview(message: string): DraftBlockImportPreview {
  return {
    rows: [],
    errors: [{ message }],
    canImport: false
  };
}

function normalizeText(value: unknown) {
  return normalizeXlsxText(value);
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
