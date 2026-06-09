const PRODUCT_FILE_PREFIX = "package-tetris";

export function createWorkspaceBackupFilename(date: Date = new Date()): string {
  return `${PRODUCT_FILE_PREFIX}-library-${createLocalDateLabel(date)}.json`;
}

function createLocalDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
