import { runPackingEngineV0 } from "./packing-engine";
import type { PackingWorkerRequest, PackingWorkerResponse } from "./packing-worker-client";

interface PackingWorkerScope {
  addEventListener(type: "message", listener: (event: MessageEvent<PackingWorkerRequest>) => void): void;
  postMessage(response: PackingWorkerResponse): void;
}

const packingWorkerScope = self as unknown as PackingWorkerScope;

packingWorkerScope.addEventListener("message", (event: MessageEvent<PackingWorkerRequest>) => {
  const request = event.data;

  try {
    const output = runPackingEngineV0(request.input);
    const response: PackingWorkerResponse = {
      requestId: request.requestId,
      ok: true,
      output
    };

    packingWorkerScope.postMessage(response);
  } catch (error) {
    const response: PackingWorkerResponse = {
      requestId: request.requestId,
      ok: false,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : "packing worker failed"
    };

    packingWorkerScope.postMessage(response);
  }
});

export {};
