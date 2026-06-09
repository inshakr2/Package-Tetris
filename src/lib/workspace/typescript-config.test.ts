import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface TypeScriptConfig {
  exclude?: string[];
}

test("tsconfig excludes static export output from type checking", () => {
  // Given
  const config = JSON.parse(readFileSync("tsconfig.json", "utf8")) as TypeScriptConfig;

  // When
  const excludedPaths = config.exclude ?? [];

  // Then
  assert.ok(
    excludedPaths.includes("out"),
    "tsconfig.json must exclude out so Next static export artifacts do not break type checking after build.",
  );
});
