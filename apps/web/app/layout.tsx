import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { LocaleProvider } from "../lib/i18n/locale-context";
import { RegisterServiceWorker } from "./register-sw";
import { BottomNav } from "../components/BottomNav";

export const metadata: Metadata = {
  title: "Drop",
  description: "모바일 ↔ PC 파일 중계",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Drop" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LocaleProvider>
          <AuthProvider>
            <RegisterServiceWorker />
            <div className="page-with-bottom-nav">{children}</div>
            <BottomNav />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
