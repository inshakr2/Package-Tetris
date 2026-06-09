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
    assert.equal(filename, "package-tetris-space-2-loading-2026-06-09.txt");
  });

  it("공간명이 있으면 한글 공간명과 선택 공간 번호를 파일명에 함께 넣는다", () => {
    // Given
    const selectedSpaceIndex = 0;
    const localDate = new Date(2026, 5, 9, 8, 30, 0);
    const spaceName = " 2.5톤반 냉장칸 ";

    // When
    const filename = createStackingInstructionFilename(selectedSpaceIndex, localDate, spaceName);

    // Then
    assert.equal(filename, "package-tetris-2.5톤반-냉장칸-space-1-loading-2026-06-09.txt");
  });

  it("공간명의 파일명 예약 문자는 하이픈으로 정리한다", () => {
    // Given
    const selectedSpaceIndex = 2;
    const localDate = new Date(2026, 5, 9, 8, 30, 0);
    const spaceName = '트럭/냉장칸?A* "상차"';

    // When
    const filename = createStackingInstructionFilename(selectedSpaceIndex, localDate, spaceName);

    // Then
    assert.equal(filename, "package-tetris-트럭-냉장칸-A-상차-space-3-loading-2026-06-09.txt");
  });

  it("긴 공간명은 다운로드 폴더에서 다루기 쉬운 길이로 줄인다", () => {
    // Given
    const selectedSpaceIndex = 0;
    const localDate = new Date(2026, 5, 9, 8, 30, 0);
    const spaceName = "a".repeat(80);

    // When
    const filename = createStackingInstructionFilename(selectedSpaceIndex, localDate, spaceName);

    // Then
    assert.equal(filename, `package-tetris-${"a".repeat(48)}-space-1-loading-2026-06-09.txt`);
  });

  it("선택 공간이 없으면 기본 space 파일명을 만든다", () => {
    // Given
    const selectedSpaceIndex = -1;
    const localDate = new Date(2026, 0, 2, 21, 10, 0);

    // When
    const filename = createStackingInstructionFilename(selectedSpaceIndex, localDate);

    // Then
    assert.equal(filename, "package-tetris-space-loading-2026-01-02.txt");
  });

  it("저장 성공 문구는 다운로드 폴더와 파일명을 알려준다", () => {
    // Given
    const filename = "package-tetris-space-1-loading-2026-06-09.txt";

    // When
    const message = createStackingInstructionDownloadSuccessMessage(filename);

    // Then
    assert.equal(
      message,
      "작업 지시서 파일을 만들었습니다. 다운로드 폴더에서 package-tetris-space-1-loading-2026-06-09.txt 파일을 확인하세요."
    );
  });
});
