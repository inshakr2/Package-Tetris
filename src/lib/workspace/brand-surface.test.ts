import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
const manifestSource = readFileSync("src/app/manifest.ts", "utf8");
const appSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");

describe("brand-surface", () => {
  it("브라우저 메타데이터와 PWA manifest는 Package Tetris를 기본 제품명으로 사용한다", () => {
    // Given / When / Then
    assert.match(layoutSource, /applicationName:\s*"Package Tetris"/);
    assert.match(layoutSource, /title:\s*"Package Tetris"/);
    assert.match(manifestSource, /name:\s*"Package Tetris"/);
    assert.match(manifestSource, /short_name:\s*"Package Tetris"/);
    assert.doesNotMatch(layoutSource, /applicationName:\s*"테트리스 적재 최적화"/);
    assert.doesNotMatch(layoutSource, /title:\s*"테트리스 적재 최적화"/);
  });

  it("앱 상단 헤더는 Package Tetris를 첫 화면 제품명으로 보여준다", () => {
    // Given / When / Then
    assert.equal((appSource.match(/<h1>Package Tetris<\/h1>/g) ?? []).length, 2);
    assert.doesNotMatch(appSource, /<h1>테트리스 적재 최적화<\/h1>/);
  });
});
