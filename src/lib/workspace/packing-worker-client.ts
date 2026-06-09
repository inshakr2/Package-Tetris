import { runPackingEngineV0 } from "./packing-engine";
import type { OptimizationInput, OptimizationOutput } from "./engine-contract";

export interface PackingWorkerRequest {
  requestId: string;
  input: OptimizationInput;
}

export type PackingWorkerResponse =
  | {
      requestId: string;
      ok: true;
      output: OptimizationOutput;
    }
  | {
      requestId: string;
      ok: false;
      errorName: string;
      errorMessage: string;
    };

interface RunPackingEngineInWorkerOptions {
  requestId?: string;
  timeoutMs?: number;
  workerFactory?: () => Worker;
}

const DEFAULT_PACKING_WORKER_TIMEOUT_MS = 20_000;

export function runPackingEngineInWorker(
  input: OptimizationInput,
  options: RunPackingEngineInWorkerOptions = {}
): Promise<OptimizationOutput> {
  const requestId = options.requestId ?? createPackingWorkerRequestId();
  const timeoutMs = options.timeoutMs ?? DEFAULT_PACKING_WORKER_TIMEOUT_MS;
  const workerFactory = options.workerFactory ?? createPackingWorker;

  let worker: Worker;

  try {
    worker = workerFactory();
  } catch {
    return Promise.resolve(runPackingEngineV0(input));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!cleanup()) {
        return;
      }

      reject(new Error("packing worker timeout"));
    }, timeoutMs);

    const cleanup = () => {
      if (settled) {
        return false;
      }

      settled = true;
      clearTimeout(timeoutId);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
      return true;
    };

    const handleMessage = (event: MessageEvent<PackingWorkerResponse>) => {
      const response = event.data;

      if (!response || response.requestId !== requestId) {
        return;
      }

      if (!cleanup()) {
        return;
      }

      if (response.ok) {
        resolve(response.output);
        return;
      }

      reject(createWorkerError(response));
    };

    const handleError = (event: ErrorEvent) => {
      if (!cleanup()) {
        return;
      }

      reject(event.error instanceof Error ? event.error : new Error(event.message || "packing worker error"));
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ requestId, input } satisfies PackingWorkerRequest);
  });
}

function createPackingWorker() {
  if (typeof Worker === "undefined") {
    throw new Error("worker unsupported");
  }

  return new Worker(new URL("./packing-worker.ts", import.meta.url), {
    type: "module"
  });
}

function createPackingWorkerRequestId() {
  return `packing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createWorkerError(response: Extract<PackingWorkerResponse, { ok: false }>) {
  const error = new Error(response.errorMessage || "packing worker failed");
  error.name = response.errorName || "Error";
  return error;
}
