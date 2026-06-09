import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readOptional(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const workspaceAppSource = readOptional("src/components/tetris-workspace-app.tsx");
const workerClientSource = readOptional("src/lib/workspace/packing-worker-client.ts");
const workerSource = readOptional("src/lib/workspace/packing-worker.ts");

describe("packing-worker-layout", () => {
  it("결과 생성 화면은 직접 엔진 호출 대신 Worker 계산 클라이언트를 사용한다", () => {
    // Given / When
    const hasWorkerWiring =
      workspaceAppSource.includes("runPackingEngineInWorker") &&
      workspaceAppSource.includes("await runPackingEngineInWorker(optimizationInput)") &&
      !workspaceAppSource.includes('from "@/lib/workspace/packing-engine"');

    // Then
    assert.equal(hasWorkerWiring, true);
  });

  it("Worker 클라이언트는 import.meta.url 기반 Worker와 메인 스레드 fallback을 함께 제공한다", () => {
    // Given / When
    const hasClientContract =
      workerClientSource.includes('new Worker(new URL("./packing-worker.ts", import.meta.url), {') &&
      workerClientSource.includes('type: "module"') &&
      workerClientSource.includes("runPackingEngineV0(input)") &&
      workerClientSource.includes("worker.terminate()");

    // Then
    assert.equal(hasClientContract, true);
  });

  it("Worker 파일은 요청 ID를 유지해 성공과 실패 응답을 돌려준다", () => {
    // Given / When
    const hasWorkerContract =
      workerSource.includes('packingWorkerScope.addEventListener("message"') &&
      workerSource.includes("runPackingEngineV0(request.input)") &&
      workerSource.includes("requestId: request.requestId") &&
      workerSource.includes("ok: true") &&
      workerSource.includes("ok: false");

    // Then
    assert.equal(hasWorkerContract, true);
  });
});
