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

export const BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS = [
  ["금영", "스피커", "KMS-210 스피커 박스", "420", "360", "520", "18.5", "아니오"],
  ["엔터그레인", "앰프", "EG-AMP 조합 박스", "500", "410", "220", "", "예"]
] as const;

export const BLOCK_TEMPLATE_IMPORT_SAMPLE_FILE_NAME = "package-tetris-box-import-sample.xlsx";

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

export interface BlockTemplateImportSampleWorkbook {
  fileName: string;
  mimeType: typeof XLSX_MIME_TYPE;
  bytes: Uint8Array<ArrayBuffer>;
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

export function createBlockTemplateImportSampleWorkbook(): BlockTemplateImportSampleWorkbook {
  const rows = [Array.from(BLOCK_TEMPLATE_XLSX_COLUMNS), ...BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS.map((row) => Array.from(row))];

  return {
    fileName: BLOCK_TEMPLATE_IMPORT_SAMPLE_FILE_NAME,
    mimeType: XLSX_MIME_TYPE,
    bytes: createMinimalXlsxWorkbook(rows)
  };
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

// 샘플 다운로드만 필요하므로 압축 없는 최소 OOXML workbook을 직접 만든다.
function createMinimalXlsxWorkbook(rows: readonly (readonly string[])[]): Uint8Array<ArrayBuffer> {
  const sharedStrings = createSharedStringTable(rows);
  const files = [
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="박스일괄등록" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`
    },
    {
      path: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`
    },
    {
      path: "xl/sharedStrings.xml",
      content: createSharedStringsXml(sharedStrings.values)
    },
    {
      path: "xl/worksheets/sheet1.xml",
      content: createWorksheetXml(rows, sharedStrings.indexByValue)
    }
  ];

  return createStoredZip(files);
}

function createSharedStringTable(rows: readonly (readonly string[])[]) {
  const values: string[] = [];
  const indexByValue = new Map<string, number>();

  for (const row of rows) {
    for (const cell of row) {
      if (indexByValue.has(cell)) {
        continue;
      }

      indexByValue.set(cell, values.length);
      values.push(cell);
    }
  }

  return { values, indexByValue };
}

function createWorksheetXml(rows: readonly (readonly string[])[], sharedStringIndexes: Map<string, number>) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((cell, columnIndex) => {
          const sharedStringIndex = sharedStringIndexes.get(cell) ?? 0;
          return `<c r="${toExcelColumnName(columnIndex)}${rowNumber}" t="s"><v>${sharedStringIndex}</v></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function createSharedStringsXml(values: readonly string[]) {
  const strings = values.map((value) => `<si><t>${escapeXml(value)}</t></si>`).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${values.length}" uniqueCount="${values.length}">${strings}</sst>`;
}

function toExcelColumnName(columnIndex: number) {
  let column = "";
  let value = columnIndex + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createStoredZip(files: readonly { path: string; content: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const localHeader = createLocalFileHeader(fileName, data, crc);
    const centralHeader = createCentralDirectoryHeader(fileName, data, crc, offset);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + data.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = concatBytes(centralParts);
  const endOfCentralDirectory = createEndOfCentralDirectory(files.length, centralDirectory.byteLength, centralDirectoryOffset);

  return concatBytes([...localParts, centralDirectory, endOfCentralDirectory]);
}

function createLocalFileHeader(fileName: Uint8Array, data: Uint8Array, crc: number) {
  const header = new Uint8Array(30 + fileName.byteLength);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.byteLength, true);
  view.setUint32(22, data.byteLength, true);
  view.setUint16(26, fileName.byteLength, true);
  view.setUint16(28, 0, true);
  header.set(fileName, 30);

  return header;
}

function createCentralDirectoryHeader(fileName: Uint8Array, data: Uint8Array, crc: number, localHeaderOffset: number) {
  const header = new Uint8Array(46 + fileName.byteLength);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.byteLength, true);
  view.setUint32(24, data.byteLength, true);
  view.setUint16(28, fileName.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  header.set(fileName, 46);

  return header;
}

function createEndOfCentralDirectory(fileCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return header;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }

  return output;
}

const CRC32_TABLE = createCrc32Table();

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
