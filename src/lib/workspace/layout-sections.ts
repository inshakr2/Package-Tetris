import { StepKey } from "./types";

export type WorkspaceSectionId = Extract<StepKey, "space" | "blocks" | "review" | "result">;

export const WORKSPACE_SECTION_ORDER: ReadonlyArray<{
  sectionId: WorkspaceSectionId;
  title: string;
  stepLabel: string;
}> = [
  {
    sectionId: "space",
    title: "1. 적재 공간 선택",
    stepLabel: "1 공간"
  },
  {
    sectionId: "blocks",
    title: "2. 박스 등록",
    stepLabel: "2 박스"
  },
  {
    sectionId: "review",
    title: "3. 실행 전 확인",
    stepLabel: "3 확인"
  },
  {
    sectionId: "result",
    title: "4. 결과 확인",
    stepLabel: "4 결과"
  }
];

export function getWorkspaceSectionTitle(sectionId: WorkspaceSectionId) {
  return WORKSPACE_SECTION_ORDER.find((section) => section.sectionId === sectionId)?.title ?? sectionId;
}
