import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConnectivityStatus } from "./connectivity-status";

describe("connectivity-status", () => {
  it("온라인 상태에서는 별도 배너를 숨긴다", () => {
    // Given
    const input = {
      networkState: "online" as const,
      hasMeaningfulWorkspaceData: true
    };

    // When
    const status = createConnectivityStatus(input);

    // Then
    assert.deepEqual(status, {
      visible: false,
      tone: "neutral",
      title: "온라인",
      description: "네트워크 연결이 감지되었습니다.",
      pillLabel: "온라인"
    });
  });

  it("초기 확인 중 상태도 별도 UI를 띄우지 않는다", () => {
    // Given
    const input = {
      networkState: "unknown" as const,
      hasMeaningfulWorkspaceData: true
    };

    // When
    const status = createConnectivityStatus(input);

    // Then
    assert.deepEqual(status, {
      visible: false,
      tone: "neutral",
      title: "연결 확인 중",
      description: "네트워크 상태를 확인하고 있습니다.",
      pillLabel: "연결 확인 중"
    });
  });

  it("인터넷 끊김이 감지되고 작업 데이터가 있으면 현재 작업 유지와 백업 파일을 안내한다", () => {
    // Given
    const input = {
      networkState: "offline" as const,
      hasMeaningfulWorkspaceData: true
    };

    // When
    const status = createConnectivityStatus(input);

    // Then
    assert.deepEqual(status, {
      visible: true,
      tone: "amber",
      title: "인터넷 끊김 감지",
      description: "현재 화면 작업은 이 기기에 계속 저장됩니다. 새로고침하거나 창을 닫기 전 백업 파일을 만들어 주세요.",
      pillLabel: "인터넷 끊김 · 백업 권장"
    });
  });

  it("인터넷 끊김이 감지됐지만 작업 데이터가 없으면 백업 버튼 없이 새로고침 주의만 안내한다", () => {
    // Given
    const input = {
      networkState: "offline" as const,
      hasMeaningfulWorkspaceData: false
    };

    // When
    const status = createConnectivityStatus(input);

    // Then
    assert.deepEqual(status, {
      visible: true,
      tone: "amber",
      title: "인터넷 끊김 감지",
      description: "앱이 열려 있는 동안 입력은 가능하지만, 인터넷이 돌아오기 전에는 새로고침을 피하세요.",
      pillLabel: "인터넷 끊김 감지"
    });
  });
});
