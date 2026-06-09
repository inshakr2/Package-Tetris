import type { ImportConflict } from "./types";

export interface ImportConflictCopy {
  title: string;
  description: string;
  backupHint: string;
  actionLabels: {
    keepCurrent: string;
    replace: string;
    openCopy: string;
    cancel: string;
  };
}

const ACTION_LABELS: ImportConflictCopy["actionLabels"] = {
  keepCurrent: "현재 화면 유지",
  replace: "가져온 파일로 대체",
  openCopy: "복사본으로 열기",
  cancel: "가져오기 취소"
};

export function getImportConflictCopy(conflict: ImportConflict): ImportConflictCopy {
  return {
    ...getImportConflictMessage(conflict),
    backupHint: "대체하기 전에는 현재 화면을 백업 파일로 남겨두는 것이 안전합니다.",
    actionLabels: ACTION_LABELS
  };
}

function getImportConflictMessage(conflict: ImportConflict) {
  switch (conflict.kind) {
    case "different-file":
      return {
        title: "다른 작업의 백업 파일입니다.",
        description: "현재 작업을 바꾸거나, 가져온 파일을 복사본으로 따로 열 수 있습니다."
      };
    case "same-file-no-conflict":
      return {
        title: "같은 작업의 백업 파일입니다.",
        description: "현재 화면을 가져온 파일 내용으로 바꿀 수 있습니다."
      };
    case "same-file-revision-conflict":
      return {
        title: "같은 작업의 다른 저장본을 가져왔습니다.",
        description: "현재 화면과 가져온 파일 중 어떤 것을 사용할지 선택하세요."
      };
  }
}
