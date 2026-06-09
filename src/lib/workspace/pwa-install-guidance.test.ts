import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPwaInstallActionLabel,
  getPwaInstallGuidanceCopy,
  type PwaInstallStatus
} from "./pwa-install-guidance";

describe("pwa-install-guidance", () => {
  it("설치 가능 상태는 현장 태블릿에 바로가기를 만들 수 있음을 안내한다", () => {
    // Given
    const status: PwaInstallStatus = "available";

    // When
    const copy = getPwaInstallGuidanceCopy(status);

    // Then
    assert.equal(copy.tone, "amber");
    assert.equal(copy.value, "설치 가능");
    assert.match(copy.description, /현장 태블릿|홈 화면/);
    assert.equal(getPwaInstallActionLabel(status), "앱 설치");
  });

  it("자동 설치 버튼이 없는 브라우저는 홈 화면 추가 방법을 브라우저별로 안내한다", () => {
    // Given
    const status: PwaInstallStatus = "manual";

    // When
    const copy = getPwaInstallGuidanceCopy(status);

    // Then
    assert.equal(copy.tone, "neutral");
    assert.equal(copy.value, "안내 필요");
    assert.match(copy.description, /브라우저 메뉴|홈 화면/);
    assert.match(copy.detail, /Chrome|Edge|Safari|공유/);
    assert.equal(getPwaInstallActionLabel(status), "설치 안내");
  });

  it("이미 설치된 상태는 추가 조작 없이 앱처럼 열 수 있음을 알려준다", () => {
    // Given
    const status: PwaInstallStatus = "installed";

    // When
    const copy = getPwaInstallGuidanceCopy(status);

    // Then
    assert.equal(copy.tone, "green");
    assert.equal(copy.value, "설치됨");
    assert.match(copy.description, /앱처럼/);
    assert.equal(getPwaInstallActionLabel(status), "설치됨");
  });
});
