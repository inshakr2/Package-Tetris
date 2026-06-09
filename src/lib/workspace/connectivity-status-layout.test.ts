import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("connectivity-status-layout", () => {
  it("네트워크 상태 pill은 저장 상태 근처에서 compact 상태로 표시된다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const pillRule = css.match(
      /\.connectivity-status-pill\s*{[\s\S]*?border-color:\s*rgba\(183,\s*121,\s*31,\s*0\.3\);[\s\S]*?}/
    );

    // Then
    assert.ok(pillRule, "connectivity status should be styled as a compact amber pill");
  });

  it("모바일 네트워크 상태 pill은 줄바꿈을 허용해 가로 넘침을 피한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.connectivity-status-pill\s*{[\s\S]*?max-width:\s*100%;[\s\S]*?white-space:\s*normal;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileRule, "mobile connectivity pill should wrap instead of forcing horizontal overflow");
  });
});
