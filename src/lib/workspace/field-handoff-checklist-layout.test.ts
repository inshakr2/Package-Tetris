import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("field-handoff-checklist-layout", () => {
  it("결과 화면은 지시서 없이 현장 전달 전 점검 패널과 복구/백업 행동을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const importsChecklist = source.includes("createFieldHandoffChecklist");
    const buildsChecklist =
      source.includes("const fieldHandoffChecklist = useMemo(") &&
      !source.includes("instructionCopyStatus") &&
      !source.includes("instructionDownloadStatus") &&
      !source.includes("instructionPrepared");
    const rendersPanel =
      source.includes('className="sub-panel field-handoff-panel"') &&
      source.includes("현장 전달 전 점검") &&
      source.includes("fieldHandoffChecklist.items.map");
    const wiresExistingActions =
      !source.includes("openResultInspectionDialog") &&
      !source.includes("open-instructions") &&
      source.includes("onExportJson") &&
      source.includes("onCreateResult");

    // Then
    assert.equal(importsChecklist && buildsChecklist && rendersPanel && wiresExistingActions, true);
  });

  it("현장 전달 전 점검 패널은 모바일에서 한 컬럼과 48px 액션을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const panelRule = /\.field-handoff-panel\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*10px;[\s\S]*?}/.test(css);
    const listRule = /\.field-handoff-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*8px;[\s\S]*?}/.test(css);
    const itemRule =
      /\.field-handoff-item\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\);[\s\S]*?min-width:\s*0;[\s\S]*?}/.test(
        css
      );
    const actionRule =
      /\.field-handoff-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      ) &&
      /\.field-handoff-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(css);
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.field-handoff-actions\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.equal(panelRule && listRule && itemRule && actionRule && mobileRule, true);
  });
});
