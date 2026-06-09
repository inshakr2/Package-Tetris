import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createStackingInstructionDownloadSuccessMessage,
  createStackingInstructionFilename
} from "./loading-instruction-file";

describe("loading-instruction-file", () => {
  it("선택 공간 번호와 로컬 날짜를 작업 지시서 파일명에 넣는다", () => {
    // Given
    const selectedSpaceIndex = 1;
    const localDate = new Date(2026, 5, 9, 8, 30, 0);

    // When
    const filename = createStackingInstructionFilename(selectedSpaceIndex, localDate);

    // Then
    assert.equal(filename, "my-tetris-space-2-loading-2026-06-09.txt");
  });

  it("선택 공간이 없으면 기본 space 파일명을 만든다", () => {
    // Given
    const selectedSpaceIndex = -1;
    const localDate = new Date(2026, 0, 2, 21, 10, 0);

    // When
    const filename = createStackingInstructionFilename(selectedSpaceIndex, localDate);

    // Then
    assert.equal(filename, "my-tetris-space-loading-2026-01-02.txt");
  });

  it("저장 성공 문구는 다운로드 폴더와 파일명을 알려준다", () => {
    // Given
    const filename = "my-tetris-space-1-loading-2026-06-09.txt";

    // When
    const message = createStackingInstructionDownloadSuccessMessage(filename);

    // Then
    assert.equal(
      message,
      "작업 지시서 파일을 만들었습니다. 다운로드 폴더에서 my-tetris-space-1-loading-2026-06-09.txt 파일을 확인하세요."
    );
  });
});
