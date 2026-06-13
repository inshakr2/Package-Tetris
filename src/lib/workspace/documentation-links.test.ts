import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const MARKDOWN_LINK_PATTERN = /\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

describe("documentation links", () => {
  it("로컬 Markdown 링크는 문서 위치 기준으로 실제 파일을 가리킨다", () => {
    // Given
    const repoRoot = process.cwd();
    const markdownFiles = collectMarkdownFiles(repoRoot);

    // When
    const brokenLinks = markdownFiles.flatMap((filePath) => findBrokenLocalMarkdownLinks(repoRoot, filePath));

    // Then
    assert.deepEqual(brokenLinks, []);
  });
});

function collectMarkdownFiles(dirPath: string): string[] {
  return readdirSync(dirPath).flatMap((entryName) => {
    const entryPath = path.join(dirPath, entryName);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      if ([".git", ".next", "node_modules"].includes(entryName)) {
        return [];
      }

      return collectMarkdownFiles(entryPath);
    }

    return entryName.endsWith(".md") ? [entryPath] : [];
  });
}

function findBrokenLocalMarkdownLinks(repoRoot: string, filePath: string) {
  const source = readFileSync(filePath, "utf8");
  const brokenLinks: string[] = [];

  for (const match of source.matchAll(MARKDOWN_LINK_PATTERN)) {
    const target = match[1];

    if (!target || isExternalOrAnchorLink(target)) {
      continue;
    }

    const targetPath = decodeURIComponent(target.split("#")[0] ?? "");

    if (!targetPath) {
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), targetPath);

    if (!existsSync(resolvedPath)) {
      brokenLinks.push(
        `${path.relative(repoRoot, filePath)} -> ${target} (${path.relative(repoRoot, resolvedPath)})`
      );
    }
  }

  return brokenLinks;
}

function isExternalOrAnchorLink(target: string) {
  return /^(https?:|mailto:|app:\/\/|#)/.test(target);
}
