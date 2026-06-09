export type PwaInstallStatus = "checking" | "available" | "manual" | "prompting" | "accepted" | "dismissed" | "installed";

export interface PwaInstallGuidanceCopy {
  tone: "green" | "amber" | "red" | "neutral";
  value: string;
  description: string;
  detail: string;
}

export function getPwaInstallGuidanceCopy(status: PwaInstallStatus): PwaInstallGuidanceCopy {
  switch (status) {
    case "available":
      return {
        tone: "amber",
        value: "설치 가능",
        description: "현장 태블릿이나 PC 홈 화면에 Package Tetris 바로가기를 만들 수 있습니다.",
        detail: "`앱 설치`를 누르면 브라우저의 설치 확인 창이 열립니다."
      };
    case "prompting":
      return {
        tone: "amber",
        value: "설치 확인 중",
        description: "브라우저 설치 확인 창에서 설치 여부를 선택하세요.",
        detail: "설치 창이 보이지 않으면 브라우저 메뉴에서 홈 화면 추가를 사용하세요."
      };
    case "accepted":
      return {
        tone: "green",
        value: "설치 진행 중",
        description: "브라우저가 Package Tetris 설치를 진행하고 있습니다.",
        detail: "설치 후에는 홈 화면이나 앱 목록에서 Package Tetris를 열 수 있습니다."
      };
    case "dismissed":
      return {
        tone: "neutral",
        value: "나중에 설치",
        description: "설치를 건너뛰었습니다. 필요하면 브라우저 메뉴에서 다시 추가할 수 있습니다.",
        detail: "Chrome/Edge는 주소창 설치 아이콘 또는 메뉴의 앱 설치를, Safari는 공유 버튼의 홈 화면 추가를 사용하세요."
      };
    case "installed":
      return {
        tone: "green",
        value: "설치됨",
        description: "Package Tetris를 앱처럼 열 수 있습니다.",
        detail: "작업 데이터 보존은 설치 여부와 별개입니다. 중요한 작업은 백업 파일로 보관하세요."
      };
    case "manual":
      return {
        tone: "neutral",
        value: "안내 필요",
        description: "브라우저 메뉴에서 앱 설치 또는 홈 화면 추가를 선택하세요.",
        detail: "Chrome/Edge는 주소창 설치 아이콘 또는 메뉴의 앱 설치를, Safari는 공유 버튼의 홈 화면 추가를 사용하세요."
      };
    case "checking":
    default:
      return {
        tone: "neutral",
        value: "확인 중",
        description: "이 브라우저에서 앱 설치 버튼을 바로 열 수 있는지 확인합니다.",
        detail: "확인이 끝나기 전에도 브라우저 메뉴에서 홈 화면 추가를 사용할 수 있습니다."
      };
  }
}

export function getPwaInstallActionLabel(status: PwaInstallStatus) {
  switch (status) {
    case "available":
      return "앱 설치";
    case "prompting":
      return "설치 확인 중";
    case "accepted":
      return "설치 진행 중";
    case "installed":
      return "설치됨";
    default:
      return "설치 안내";
  }
}
