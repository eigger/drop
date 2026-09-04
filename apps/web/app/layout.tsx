import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { LocaleProvider } from "../lib/i18n/locale-context";
import { RegisterServiceWorker } from "./register-sw";
import { BottomNav } from "../components/BottomNav";
import { withBasePath } from "../lib/base-path";

// manifest는 app/manifest.ts가 라우트로 그리고 Next가 <link rel="manifest">까지 붙여준다 —
// 여기에 경로를 다시 적으면 basePath가 빠진 주소로 덮어써진다.
export const metadata: Metadata = {
  title: "Drop",
  description: "모바일 ↔ PC 파일 중계",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Drop" },
  // public/ 아이콘은 Next가 basePath를 안 붙인다. 서브패스에서 HA 오리진을 두드리지 않게 직접 붙인다.
  icons: {
    icon: withBasePath("/icons/icon.svg"),
    apple: withBasePath("/icons/apple-touch-icon.png"),
  },
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
