import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");

describe("chain-simulation-retry-layout", () => {
  it("추가 박스 시뮬레이션 오류 상태에서도 선택한 박스를 바로 다시 계산할 수 있다", () => {
    // Given
    const canCalculateAllowsRetry =
      /const canCalculate = hasResult && Boolean\(selectedTemplateId\) && chainStatus !== "calculating";/.test(
        workspaceSource
      );
    const calculateButtonShowsRetryCopy =
      workspaceSource.includes('chainStatus === "error"') &&
      workspaceSource.includes('"다시 계산"') &&
      workspaceSource.includes('"최대 적재 계산"');

    // When
    const hasRetryContract = canCalculateAllowsRetry && calculateButtonShowsRetryCopy;

    // Then
    assert.equal(hasRetryContract, true);
  });
});
