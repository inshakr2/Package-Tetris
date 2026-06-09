import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "테트리스 적재 최적화",
  title: "테트리스 적재 최적화",
  description: "프론트 단독으로 커스텀 공간과 블록을 저장하는 적재 최적화 작업대",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "적재 최적화",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
