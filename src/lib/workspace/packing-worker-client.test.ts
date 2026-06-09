import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  runPackingEngineInWorker,
  type PackingWorkerRequest,
  type PackingWorkerResponse
} from "./packing-worker-client";
import type { OptimizationInput, OptimizationOutput } from "./engine-contract";

function createInput(): OptimizationInput {
  return {
    runId: "worker-run",
    space: {
      spaceId: "space-worker",
      entityVersion: 1,
      name: "작업자 테스트 공간",
      type: "custom",
      dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
      offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z"
    },
    blocks: [
      {
        blockId: "block-worker",
        blockTemplateId: "template-worker",
        draftBlockItemId: "item-worker",
        entityVersion: 1,
        name: "작업자 박스",
        dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
        quantity: 1,
        fragile: false,
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:00.000Z"
      }
    ],
    policy: {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      rotation: "orthogonal-90deg"
    }
  };
}

function createOutput(runId = "worker-run"): OptimizationOutput {
  return {
    runId,
    usedSpaceCount: 1,
    averageUtilizationRate: 0.125,
    unloadedBlockCount: 0,
    spaces: [],
    warnings: []
  };
}

class FakePackingWorker {
  terminated = false;
  requests: PackingWorkerRequest[] = [];
  private listeners = new Map<string, Array<(event: { data: PackingWorkerResponse }) => void>>();

  constructor(private readonly createResponse: (request: PackingWorkerRequest) => PackingWorkerResponse) {}

  addEventListener(type: string, listener: (event: { data: PackingWorkerResponse }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: (event: { data: PackingWorkerResponse }) => void) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener)
    );
  }

  postMessage(request: PackingWorkerRequest) {
    this.requests.push(request);

    queueMicrotask(() => {
      (this.listeners.get("message") ?? []).forEach((listener) => {
        listener({ data: this.createResponse(request) });
      });
    });
  }

  terminate() {
    this.terminated = true;
  }
}

describe("packing-worker-client", () => {
  it("Worker 응답으로 적재 결과를 반환하고 계산 후 Worker를 정리한다", async () => {
    // Given
    const input = createInput();
    const output = createOutput();
    const fakeWorker = new FakePackingWorker((request) => ({
      requestId: request.requestId,
      ok: true,
      output
    }));

    // When
    const result = await runPackingEngineInWorker(input, {
      requestId: "request-a",
      timeoutMs: 1000,
      workerFactory: () => fakeWorker as unknown as Worker
    });

    // Then
    assert.deepEqual(result, output);
    assert.equal(fakeWorker.requests[0]?.requestId, "request-a");
    assert.equal(fakeWorker.terminated, true);
  });

  it("Worker 생성이 막힌 환경에서는 기존 계산 엔진으로 fallback한다", async () => {
    // Given
    const input = createInput();

    // When
    const result = await runPackingEngineInWorker(input, {
      timeoutMs: 1000,
      workerFactory: () => {
        throw new Error("worker blocked");
      }
    });

    // Then
    assert.equal(result.usedSpaceCount, 1);
    assert.equal(result.unloadedBlockCount, 0);
    assert.equal(result.spaces[0]?.blocks[0]?.blockTemplateId, "template-worker");
  });

  it("Worker가 계산 실패를 보내면 작업자 문구로 처리할 수 있도록 오류를 반환한다", async () => {
    // Given
    const input = createInput();
    const fakeWorker = new FakePackingWorker((request) => ({
      requestId: request.requestId,
      ok: false,
      errorName: "Error",
      errorMessage: "worker calculation failed"
    }));

    // When / Then
    await assert.rejects(
      () =>
        runPackingEngineInWorker(input, {
          requestId: "request-b",
          timeoutMs: 1000,
          workerFactory: () => fakeWorker as unknown as Worker
        }),
      /worker calculation failed/
    );
    assert.equal(fakeWorker.terminated, true);
  });
});
