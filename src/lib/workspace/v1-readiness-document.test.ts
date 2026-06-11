import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const V1_READINESS_PATH = join(process.cwd(), "docs/v1-readiness.md");
const FIELD_GUIDE_PATH = join(process.cwd(), "docs/field-demo-user-guide.md");
const NON_DEVELOPER_GUIDE_PATH = join(process.cwd(), "docs/non-developer-start-guide.md");
const README_PATH = join(process.cwd(), "README.md");

describe("v1 readiness document", () => {
  it("V1 마감 문서는 완료 범위와 운영 전 파일럿 범위를 분리한다", () => {
    // Given / When
    const exists = existsSync(V1_READINESS_PATH);
    const document = exists ? readFileSync(V1_READINESS_PATH, "utf8") : "";

    // Then
    assert.equal(exists, true);
    assert.match(document, /V1 완료 기준/);
    assert.match(document, /프론트 단독/);
    assert.match(document, /IndexedDB/);
    assert.match(document, /JSON 백업/);
    assert.match(document, /npm run v1:verify/);
    assert.match(document, /현장 파일럿 확인/);
    assert.match(document, /서버 기반 여러 기기 자동 동기화/);
    assert.match(document, /V1 역사 기준/);
    assert.match(document, /V2 현행 흐름이 아니다/);
    assert.match(document, /V2에서는 작업 지시서 대신 3D와 공간 확인/);
  });

  it("활성 문서는 V1 마감 문서를 역사 기준으로만 연결한다", () => {
    // Given
    const fieldGuide = readFileSync(FIELD_GUIDE_PATH, "utf8");
    const nonDeveloperGuide = readFileSync(NON_DEVELOPER_GUIDE_PATH, "utf8");
    const readme = readFileSync(README_PATH, "utf8");

    // When / Then
    assert.match(fieldGuide, /docs\/v1-readiness\.md/);
    assert.match(fieldGuide, /V1 역사 완료 기준/);
    assert.match(fieldGuide, /V2 현행 결과 확인/);
    assert.match(nonDeveloperGuide, /V1 역사 기준/);
    assert.match(nonDeveloperGuide, /V2 현행 흐름/);
    assert.match(readme, /V1 역사 완료 기준/);
  });
});
