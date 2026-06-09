import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "테트리스 적재 최적화",
    short_name: "적재 최적화",
    description: "커스텀 공간과 블록을 로컬에 저장하고 JSON으로 이동하는 적재 최적화 작업대",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
