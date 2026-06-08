import { StepKey } from "./types";

export type WorkspaceSectionId = Extract<StepKey, "space" | "blocks" | "review" | "result">;

export const WORKSPACE_SECTION_ORDER: ReadonlyArray<{
  sectionId: WorkspaceSectionId;
  title: string;
  stepLabel: string;
}> = [
  {
    sectionId: "space",
    title: "1. 공간 라이브러리",
    stepLabel: "1 공간"
  },
  {
    sectionId: "blocks",
    title: "2. 블록 라이브러리",
    stepLabel: "2 블록"
  },
  {
    sectionId: "review",
    title: "3. 현재 적재 및 실행 전 검토",
    stepLabel: "3 적재"
  },
  {
    sectionId: "result",
    title: "4. 결과 요약",
    stepLabel: "4 결과"
  }
];

export function getWorkspaceSectionTitle(sectionId: WorkspaceSectionId) {
  return WORKSPACE_SECTION_ORDER.find((section) => section.sectionId === sectionId)?.title ?? sectionId;
}
