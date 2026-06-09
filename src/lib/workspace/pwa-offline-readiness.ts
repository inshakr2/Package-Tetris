export type PwaOfflineReadinessStatus = "checking" | "unsupported" | "registering" | "ready" | "error";

export interface PwaOfflineReadinessCopy {
  tone: "green" | "amber" | "red" | "neutral";
  value: string;
  description: string;
  detail: string;
}

export function getPwaOfflineReadinessCopy(status: PwaOfflineReadinessStatus): PwaOfflineReadinessCopy {
  switch (status) {
    case "ready":
      return {
        tone: "green",
        value: "준비됨",
        description: "한 번 열어 둔 뒤에는 인터넷이 끊겨도 앱 화면을 다시 여는 데 도움이 됩니다.",
        detail: "오프라인 준비는 백업 파일을 대체하지 않습니다. 중요한 작업은 백업 파일로 보관하세요."
      };
    case "registering":
      return {
        tone: "amber",
        value: "준비 중",
        description: "이 브라우저에서 앱 화면을 다시 열 수 있도록 준비하고 있습니다.",
        detail: "처음 한 번은 인터넷 연결이 필요합니다."
      };
    case "unsupported":
      return {
        tone: "neutral",
        value: "지원되지 않음",
        description: "이 브라우저에서는 오프라인 재진입 준비를 사용할 수 없습니다. 백업 파일을 보관하세요.",
        detail: "앱 사용은 가능하지만, 새로고침 전 인터넷 연결 상태를 확인하세요."
      };
    case "error":
      return {
        tone: "amber",
        value: "준비 실패",
        description: "오프라인 재진입 준비를 완료하지 못했습니다. 현재 작업은 이 기기에 계속 저장됩니다.",
        detail: "인터넷 연결을 확인한 뒤 앱을 새로고침하거나 백업 파일을 만들어 두세요."
      };
    case "checking":
    default:
      return {
        tone: "neutral",
        value: "확인 중",
        description: "이 브라우저에서 오프라인 재진입을 준비할 수 있는지 확인합니다.",
        detail: "확인이 끝나기 전에도 현재 작업은 이 기기에 자동저장됩니다."
      };
  }
}
