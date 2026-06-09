import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Package Tetris",
  title: "Package Tetris",
  description: "현장 작업자를 위한 적재 최적화 작업대",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Package Tetris",
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
