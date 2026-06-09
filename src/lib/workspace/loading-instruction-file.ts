const FILE_NAME_UNSAFE_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f\u007f]+/g;
const MAX_SPACE_NAME_SLUG_LENGTH = 48;

export function createStackingInstructionFilename(
  selectedPackedSpaceIndex: number,
  date: Date = new Date(),
  spaceName?: string
): string {
  const spaceIndexLabel = selectedPackedSpaceIndex >= 0 ? `space-${selectedPackedSpaceIndex + 1}` : "space";
  const spaceNameSlug = createSafeFilenameSlug(spaceName ?? "");
  const spaceLabel = spaceNameSlug ? `${spaceNameSlug}-${spaceIndexLabel}` : spaceIndexLabel;
  const dateLabel = createLocalDateLabel(date);

  return `my-tetris-${spaceLabel}-loading-${dateLabel}.txt`;
}

export function createStackingInstructionDownloadSuccessMessage(filename: string): string {
  return `작업 지시서 파일을 만들었습니다. 다운로드 폴더에서 ${filename} 파일을 확인하세요.`;
}

function createLocalDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createSafeFilenameSlug(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(FILE_NAME_UNSAFE_CHARACTERS, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\-\s]+|[.\-\s]+$/g, "")
    .slice(0, MAX_SPACE_NAME_SLUG_LENGTH)
    .replace(/^[.\-\s]+|[.\-\s]+$/g, "");
}
