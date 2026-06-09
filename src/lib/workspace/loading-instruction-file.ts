export function createStackingInstructionFilename(selectedPackedSpaceIndex: number, date: Date = new Date()): string {
  const spaceLabel = selectedPackedSpaceIndex >= 0 ? `space-${selectedPackedSpaceIndex + 1}` : "space";
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
