import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPwaOfflineReadinessCopy } from "./pwa-offline-readiness";

describe("pwa-offline-readiness", () => {
  it("준비 완료 상태는 오프라인 재진입과 백업 필요성을 함께 말한다", () => {
    // Given / When
    const copy = getPwaOfflineReadinessCopy("ready");

    // Then
    assert.equal(copy.tone, "green");
    assert.equal(copy.value, "준비됨");
    assert.match(copy.description, /인터넷이 끊겨도/);
    assert.match(copy.detail, /백업 파일을 대체하지 않습니다/);
  });

  it("지원되지 않는 환경은 오류가 아니라 백업 안내로 처리한다", () => {
    // Given / When
    const copy = getPwaOfflineReadinessCopy("unsupported");

    // Then
    assert.equal(copy.tone, "neutral");
    assert.equal(copy.value, "지원되지 않음");
    assert.match(copy.description, /백업 파일/);
  });

  it("개발 모드의 지원되지 않음 상태는 자동 새로고침 보호 때문이라고 안내한다", () => {
    // Given / When
    const copy = getPwaOfflineReadinessCopy("unsupported", { isDevelopmentMode: true });

    // Then
    assert.equal(copy.tone, "neutral");
    assert.equal(copy.value, "개발 실행 중");
    assert.match(copy.description, /자동 새로고침/);
    assert.match(copy.description, /오프라인 준비를 꺼두었습니다/);
    assert.match(copy.detail, /오류가 아닙니다/);
    assert.match(copy.detail, /npm run dev/);
  });

  it("등록 실패 상태는 다시 열기 보장 대신 백업을 권장한다", () => {
    // Given / When
    const copy = getPwaOfflineReadinessCopy("error");

    // Then
    assert.equal(copy.tone, "amber");
    assert.equal(copy.value, "준비 실패");
    assert.match(copy.detail, /인터넷 연결/);
  });
});
