import type { ResultFreshnessStatus } from "./result-freshness";

export type FieldHandoffChecklistTone = "ready" | "attention" | "waiting";
export type FieldHandoffChecklistItemStatus = "ready" | "attention" | "waiting";
export type FieldHandoffChecklistAction = "create-result" | "recalculate" | "export-backup";

export interface FieldHandoffChecklistInput {
  hasResult: boolean;
  resultFreshnessStatus: ResultFreshnessStatus;
  resultActionDisabled: boolean;
  unloadedBlockCount: number;
  warningCount: number;
  needsExport: boolean;
}

export interface FieldHandoffChecklistItem {
  id: "result" | "safety" | "backup";
  label: string;
  description: string;
  status: FieldHandoffChecklistItemStatus;
  action: FieldHandoffChecklistAction | null;
  actionLabel: string | null;
}

export interface FieldHandoffChecklist {
  title: string;
  description: string;
  tone: FieldHandoffChecklistTone;
  items: FieldHandoffChecklistItem[];
}

export function createFieldHandoffChecklist(input: FieldHandoffChecklistInput): FieldHandoffChecklist {
  const items: FieldHandoffChecklistItem[] = [createResultItem(input), createSafetyItem(input), createBackupItem(input)];
  const hasWaiting = items.some((item) => item.status === "waiting");
  const hasAttention = items.some((item) => item.status === "attention");

  if (hasWaiting) {
    return {
      title: "현장 전달 준비 중",
      description: "결과를 만들고 미적재, 경고, 백업 상태를 확인하면 현장에 전달할 수 있습니다.",
      tone: "waiting",
      items
    };
  }

  if (hasAttention) {
    return {
      title: "확인 후 현장 전달",
      description: "최신 결과, 미적재와 경고, 백업 파일 상태를 확인한 뒤 현장에 전달하세요.",
      tone: "attention",
      items
    };
  }

  return {
    title: "현장 전달 준비됨",
    description: "최신 결과와 백업 상태가 준비되었습니다.",
    tone: "ready",
    items
  };
}

function createResultItem(input: FieldHandoffChecklistInput): FieldHandoffChecklistItem {
  if (!input.hasResult) {
    return {
      id: "result",
      label: "결과 만들기",
      description: "현재 입력으로 3D 적재 결과를 먼저 만드세요.",
      status: "waiting",
      action: "create-result",
      actionLabel: "결과 만들기"
    };
  }

  if (input.resultFreshnessStatus === "stale") {
    return {
      id: "result",
      label: "결과 최신 여부",
      description: input.resultActionDisabled
        ? "입력이 바뀌었지만 지금은 다시 계산할 수 없습니다. 입력 조건을 먼저 확인하세요."
        : "입력이 바뀌었습니다. 최신 입력 기준으로 다시 계산하세요.",
      status: "attention",
      action: "recalculate",
      actionLabel: "결과 다시 만들기"
    };
  }

  if (input.resultFreshnessStatus === "unknown") {
    return {
      id: "result",
      label: "결과 기준 확인",
      description: "이전 작업본의 결과입니다. 필요하면 현재 입력 기준으로 다시 계산하세요.",
      status: "attention",
      action: "recalculate",
      actionLabel: "결과 다시 만들기"
    };
  }

  return {
    id: "result",
    label: "최신 결과",
    description: "현재 입력 기준 결과입니다.",
    status: "ready",
    action: null,
    actionLabel: null
  };
}

function createSafetyItem(input: FieldHandoffChecklistInput): FieldHandoffChecklistItem {
  if (!input.hasResult) {
    return {
      id: "safety",
      label: "미적재와 경고",
      description: "결과를 만든 뒤 미적재와 경고를 확인합니다.",
      status: "waiting",
      action: null,
      actionLabel: null
    };
  }

  if (input.unloadedBlockCount > 0 || input.warningCount > 0) {
    const unloadedPart = input.unloadedBlockCount > 0 ? `미적재 ${input.unloadedBlockCount}개` : null;
    const warningPart = input.warningCount > 0 ? `확인 문구 ${input.warningCount}건` : null;
    return {
      id: "safety",
      label: "미적재와 경고 확인",
      description: [unloadedPart, warningPart].filter(Boolean).join(" · ") + "을 현장 전달 전에 확인하세요.",
      status: "attention",
      action: null,
      actionLabel: null
    };
  }

  return {
    id: "safety",
    label: "미적재 없음",
    description: "미적재 박스와 추가 경고가 없습니다.",
    status: "ready",
    action: null,
    actionLabel: null
  };
}

function createBackupItem(input: FieldHandoffChecklistInput): FieldHandoffChecklistItem {
  if (input.needsExport) {
    return {
      id: "backup",
      label: "백업 파일",
      description: "다른 기기 이동이나 복구를 위해 백업 파일을 최신으로 만드세요.",
      status: "attention",
      action: "export-backup",
      actionLabel: "백업 파일 만들기"
    };
  }

  return {
    id: "backup",
    label: "백업 상태",
    description: "현재 백업 안내가 없습니다.",
    status: "ready",
    action: null,
    actionLabel: null
  };
}
