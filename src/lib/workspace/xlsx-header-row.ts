const UNSAFE_XLSX_HEADER_NAMES = new Set(["__proto__", "prototype", "constructor"]);

export interface XlsxHeaderMapping<Column extends string> {
  columnIndexByHeader: ReadonlyMap<Column, number>;
}

export type XlsxHeaderMappingResult<Column extends string> =
  | {
      ok: true;
      mapping: XlsxHeaderMapping<Column>;
    }
  | {
      ok: false;
      message: string;
    };

export function createXlsxHeaderMapping<Column extends string>(
  headerRow: readonly unknown[],
  expectedColumns: readonly Column[]
): XlsxHeaderMappingResult<Column> {
  if (isEmptyXlsxRow(headerRow)) {
    return rejectXlsxHeader("첫 번째 sheet가 비어 있습니다.");
  }

  const headers = headerRow.map((cell) => normalizeXlsxText(cell));
  const unsafeColumns = headers.filter((header) => UNSAFE_XLSX_HEADER_NAMES.has(header));

  if (unsafeColumns.length > 0) {
    return rejectXlsxHeader(`허용되지 않는 컬럼명이 있습니다: ${unsafeColumns.join(", ")}`);
  }

  const expectedColumnSet = new Set<string>(expectedColumns);
  const unknownColumns = headers.filter((header) => header && !expectedColumnSet.has(header));

  if (unknownColumns.length > 0) {
    return rejectXlsxHeader(`알 수 없는 컬럼이 있습니다: ${unknownColumns.join(", ")}`);
  }

  const duplicateColumns = findDuplicateXlsxHeaders(headers);

  if (duplicateColumns.length > 0) {
    return rejectXlsxHeader(`중복된 컬럼이 있습니다: ${duplicateColumns.join(", ")}`);
  }

  const missingColumns = expectedColumns.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    return rejectXlsxHeader(`필수 컬럼이 없습니다: ${missingColumns.join(", ")}`);
  }

  const columnIndexByHeader = new Map<Column, number>();

  headerRow.forEach((cell, index) => {
    const header = normalizeXlsxText(cell);

    if (expectedColumnSet.has(header)) {
      columnIndexByHeader.set(header as Column, index);
    }
  });

  return {
    ok: true,
    mapping: {
      columnIndexByHeader
    }
  };
}

export function createXlsxRowByColumn<Column extends string>(
  rawRow: readonly unknown[],
  expectedColumns: readonly Column[],
  mapping: XlsxHeaderMapping<Column>
) {
  return expectedColumns.reduce(
    (row, column) => {
      const columnIndex = mapping.columnIndexByHeader.get(column);
      row[column] = columnIndex === undefined ? undefined : rawRow[columnIndex];
      return row;
    },
    {} as Record<Column, unknown>
  );
}

export function isEmptyXlsxRow(row: readonly unknown[]) {
  return row.every((cell) => isBlankXlsxCell(cell));
}

export function isBlankXlsxCell(value: unknown) {
  return value === null || value === undefined || normalizeXlsxText(value) === "";
}

export function normalizeXlsxText(value: unknown) {
  return String(value ?? "").trim();
}

function rejectXlsxHeader<Column extends string>(message: string): XlsxHeaderMappingResult<Column> {
  return {
    ok: false,
    message
  };
}

function findDuplicateXlsxHeaders(headers: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  headers.forEach((header) => {
    if (!header) {
      return;
    }

    if (seen.has(header)) {
      duplicates.add(header);
      return;
    }

    seen.add(header);
  });

  return Array.from(duplicates);
}
