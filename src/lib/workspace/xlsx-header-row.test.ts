import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createXlsxHeaderMapping,
  createXlsxRowByColumn,
  isEmptyXlsxRow
} from "./xlsx-header-row";

describe("xlsx-header-row", () => {
  const columns = ["박스명", "작업수량", "아래층우선타입"] as const;

  it("헤더 순서가 달라도 컬럼명 기준으로 행 값을 매핑한다", () => {
    // Given
    const headerRow = ["아래층우선타입", "박스명", "작업수량"];
    const bodyRow = [3, "EG-AMP 조합 박스", 7];

    // When
    const mappingResult = createXlsxHeaderMapping(headerRow, columns);

    // Then
    if (!mappingResult.ok) {
      assert.fail(mappingResult.message);
    }

    assert.equal(mappingResult.ok, true);
    assert.deepEqual(createXlsxRowByColumn(bodyRow, columns, mappingResult.mapping), {
      박스명: "EG-AMP 조합 박스",
      작업수량: 7,
      아래층우선타입: 3
    });
  });

  it("비어 있거나 안전하지 않은 헤더는 workbook 오류 메시지로 거부한다", () => {
    // Given
    const cases = [
      {
        headerRow: [],
        message: "첫 번째 sheet가 비어 있습니다."
      },
      {
        headerRow: ["박스명", "작업수량", "아래층우선타입", "비고"],
        message: "알 수 없는 컬럼이 있습니다: 비고"
      },
      {
        headerRow: ["박스명", "박스명", "작업수량", "아래층우선타입"],
        message: "중복된 컬럼이 있습니다: 박스명"
      },
      {
        headerRow: ["박스명", "작업수량", "__proto__"],
        message: "허용되지 않는 컬럼명이 있습니다: __proto__"
      },
      {
        headerRow: ["박스명", "작업수량"],
        message: "필수 컬럼이 없습니다: 아래층우선타입"
      }
    ];

    // When
    const results = cases.map((testCase) => ({
      expectedMessage: testCase.message,
      result: createXlsxHeaderMapping(testCase.headerRow, columns)
    }));

    // Then
    assert.deepEqual(
      results.map(({ result }) => result.ok),
      [false, false, false, false, false]
    );
    assert.deepEqual(
      results.map(({ result }) => (result.ok ? "" : result.message)),
      cases.map((testCase) => testCase.message)
    );
  });

  it("빈 후행 컬럼은 무시하고, 값이 0인 셀은 빈 행으로 보지 않는다", () => {
    // Given
    const headerRow = ["박스명", "작업수량", "아래층우선타입", "", null, undefined];

    // When
    const mappingResult = createXlsxHeaderMapping(headerRow, columns);

    // Then
    assert.equal(mappingResult.ok, true);
    assert.equal(isEmptyXlsxRow([null, undefined, "   "]), true);
    assert.equal(isEmptyXlsxRow([null, 0, ""]), false);
  });
});
