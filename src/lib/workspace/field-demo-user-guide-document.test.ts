import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const FIELD_GUIDE_PATH = join(process.cwd(), "docs/field-demo-user-guide.md");

describe("field demo user guide document", () => {
  it("박스 .xlsx 일괄등록 흐름과 오류 수정 기준을 현장 언어로 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /엑셀로 박스 일괄등록/);
    assert.match(document, /\.xlsx/);
    assert.match(document, /샘플 파일 다운로드/);
    assert.match(document, /미리보기/);
    assert.match(document, /일괄등록 적용/);
    assert.match(document, /바로 저장되지|즉시 저장되지/);
    assert.match(
      document,
      /상위그룹[\s\S]*하위그룹[\s\S]*박스명[\s\S]*가로mm[\s\S]*세로mm[\s\S]*높이mm[\s\S]*무게kg[\s\S]*깨짐주의/,
    );
    assert.match(document, /오류 행/);
    assert.match(document, /행 번호/);
    assert.match(document, /사유/);
    assert.doesNotMatch(document, /작업 지시서/);
    assert.doesNotMatch(document, /배치 상세/);
    assert.doesNotMatch(document, /쌓는 순서/);
  });

  it("시연 체크리스트는 .xlsx 일괄등록과 오류 행 확인을 포함한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /\.xlsx 일괄등록 가능/);
    assert.match(document, /\.xlsx 샘플 파일 다운로드 가능/);
    assert.match(document, /오류 행과 사유 확인 가능/);
    assert.match(document, /3D와 공간 확인/);
    assert.doesNotMatch(document, /작업 지시서/);
  });
});
