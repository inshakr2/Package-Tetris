import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readOptional(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const appSource = readOptional("src/components/tetris-workspace-app.tsx");
const registrarSource = readOptional("src/components/pwa-service-worker-registrar.tsx");
const serviceWorkerSource = readOptional("public/sw.js");

describe("pwa-service-worker-layout", () => {
  it("앱은 서비스워커 등록 컴포넌트와 오프라인 준비 상태 행을 연결한다", () => {
    // Given / When
    const hasAppWiring =
      appSource.includes("PwaServiceWorkerRegistrar") &&
      appSource.includes("const [pwaOfflineStatus, setPwaOfflineStatus] = useState<PwaOfflineReadinessStatus>(\"checking\")") &&
      appSource.includes("onStatusChange={setPwaOfflineStatus}") &&
      appSource.includes("pwaOfflineStatus={pwaOfflineStatus}") &&
      appSource.includes("getPwaOfflineReadinessCopy(pwaOfflineStatus)") &&
      appSource.includes('label="오프라인 준비"');

    // Then
    assert.equal(hasAppWiring, true);
  });

  it("서비스워커 등록 컴포넌트는 지원 여부, ready, 실패 상태를 앱에 알린다", () => {
    // Given / When
    const hasRegistrarContract =
      registrarSource.includes('"serviceWorker" in navigator') &&
      registrarSource.includes('navigator.serviceWorker.register("/sw.js", {') &&
      registrarSource.includes('scope: "/"') &&
      registrarSource.includes('updateViaCache: "none"') &&
      registrarSource.includes("const setStatus = (status: PwaOfflineReadinessStatus)") &&
      registrarSource.includes("onStatusChange(status)") &&
      registrarSource.includes('onStatusChange("unsupported")') &&
      registrarSource.includes('setStatus("registering")') &&
      registrarSource.includes('setStatus("ready")') &&
      registrarSource.includes('setStatus("error")');

    // Then
    assert.equal(hasRegistrarContract, true);
  });

  it("서비스워커는 앱 셸을 캐시하고 navigation 요청을 캐시된 루트로 되돌린다", () => {
    // Given / When
    const hasServiceWorkerContract =
      serviceWorkerSource.includes("PACKAGE_TETRIS_CACHE_NAME") &&
      serviceWorkerSource.includes("self.addEventListener(\"install\"") &&
      serviceWorkerSource.includes("self.skipWaiting()") &&
      serviceWorkerSource.includes("self.addEventListener(\"activate\"") &&
      serviceWorkerSource.includes("self.clients.claim()") &&
      serviceWorkerSource.includes("self.addEventListener(\"fetch\"") &&
      serviceWorkerSource.includes('event.request.mode === "navigate"') &&
      serviceWorkerSource.includes('caches.match("/")') &&
      serviceWorkerSource.includes("cacheShellAssets") &&
      serviceWorkerSource.includes("extractShellAssetUrls");

    // Then
    assert.equal(hasServiceWorkerContract, true);
  });
});
