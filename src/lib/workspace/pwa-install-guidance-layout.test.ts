import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const appSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const planningDoc = readFileSync("docs/tetris-ui-planning-draft.md", "utf8");
const fieldGuide = readFileSync("docs/field-demo-user-guide.md", "utf8");

describe("pwa-install-guidance-layout", () => {
  it("앱은 PWA 설치 가능 이벤트와 설치 완료 이벤트를 저장 패널 상태로 연결한다", () => {
    // Given / When
    const hasInstallPromptWiring =
      appSource.includes("beforeinstallprompt") &&
      appSource.includes("appinstalled") &&
      appSource.includes("deferredInstallPromptRef") &&
      appSource.includes("setPwaInstallStatus") &&
      appSource.includes("installPwaOrShowGuidance") &&
      appSource.includes("getPwaInstallGuidanceCopy(pwaInstallStatus)") &&
      appSource.includes('label="앱 설치"');

    // Then
    assert.equal(hasInstallPromptWiring, true);
  });

  it("저장 패널은 설치 버튼을 백업/저장 보호 액션과 같은 터치 가능한 영역에 둔다", () => {
    // Given / When
    const hasInstallAction =
      appSource.includes("onInstallPwa") &&
      appSource.includes("getPwaInstallActionLabel(pwaInstallStatus)") &&
      appSource.includes("pwaInstallStatus === \"prompting\"") &&
      appSource.includes("pwaInstallStatus === \"installed\"") &&
      appSource.includes("<Smartphone size={16} />");

    // Then
    assert.equal(hasInstallAction, true);
  });

  it("기획서와 현장 가이드는 PWA 설치 안내를 후속이 아닌 현재 시연 흐름으로 설명한다", () => {
    // Given / When / Then
    assert.match(planningDoc, /PWA 설치 안내/);
    assert.doesNotMatch(planningDoc, /PWA 설치 프롬프트와 브라우저별 홈 화면 추가 안내/);
    assert.match(fieldGuide, /앱 설치|홈 화면 추가/);
    assert.match(fieldGuide, /Chrome|Edge|Safari/);
  });

  it("기획서와 현장 가이드는 개발 모드 서비스워커 비활성화 이유를 안내한다", () => {
    // Given / When / Then
    assert.match(planningDoc, /개발 모드[\s\S]*서비스워커[\s\S]*자동 새로고침/);
    assert.match(fieldGuide, /개발 시연[\s\S]*서비스워커 등록을 끄므로[\s\S]*지원되지 않음/);
  });
});
