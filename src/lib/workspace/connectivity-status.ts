export type NetworkState = "online" | "offline" | "unknown";
export type ConnectivityTone = "neutral" | "amber";

export interface ConnectivityStatusInput {
  networkState: NetworkState;
  hasMeaningfulWorkspaceData: boolean;
}

export interface ConnectivityStatus {
  visible: boolean;
  tone: ConnectivityTone;
  title: string;
  description: string;
  pillLabel: string;
}

export function createConnectivityStatus(input: ConnectivityStatusInput): ConnectivityStatus {
  if (input.networkState === "offline") {
    if (input.hasMeaningfulWorkspaceData) {
      return {
        visible: true,
        tone: "amber",
        title: "인터넷 끊김 감지",
        description: "현재 화면 작업은 이 기기에 계속 저장됩니다. 새로고침하거나 창을 닫기 전 백업 파일을 만들어 주세요.",
        pillLabel: "인터넷 끊김 · 백업 권장"
      };
    }

    return {
      visible: true,
      tone: "amber",
      title: "인터넷 끊김 감지",
      description: "앱이 열려 있는 동안 입력은 가능하지만, 인터넷이 돌아오기 전에는 새로고침을 피하세요.",
      pillLabel: "인터넷 끊김 감지"
    };
  }

  return {
    visible: false,
    tone: "neutral",
    title: input.networkState === "unknown" ? "연결 확인 중" : "온라인",
    description:
      input.networkState === "unknown"
        ? "네트워크 상태를 확인하고 있습니다."
        : "네트워크 연결이 감지되었습니다.",
    pillLabel: input.networkState === "unknown" ? "연결 확인 중" : "온라인"
  };
}
