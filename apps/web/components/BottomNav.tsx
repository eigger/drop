"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { useLocale } from "../lib/i18n/locale-context";
import type { TranslationKey } from "../lib/i18n/translations";
import { initBugReportCapture } from "../lib/bugReport";
import { BugReportModal } from "./BugReportModal";
import { HomeIcon, FilesIcon, UploadIcon, TrashIcon, MoreIcon, SettingsIcon, UsersIcon, BugIcon } from "./icons";

// Upload가 5개 슬롯(4탭 + 더보기 버튼) 중 정확히 가운데(인덱스 2)에 오도록 순서를 맞춘다 —
// stash의 [Home, Items, Scan(중앙), Shopping] + More와 같은 배치.
const TABS: { href: string; labelKey: TranslationKey; Icon: (props: { size?: number }) => JSX.Element; primary?: boolean }[] = [
  { href: "/", labelKey: "navHome", Icon: HomeIcon },
  { href: "/files", labelKey: "navFiles", Icon: FilesIcon },
  { href: "/upload", labelKey: "navUpload", Icon: UploadIcon, primary: true },
  { href: "/trash", labelKey: "navTrash", Icon: TrashIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initBugReportCapture();
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (pathname === "/login") return null;

  function go(href: string) {
    setMoreOpen(false);
    router.push(href);
  }

  return (
    <>
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const label = t(tab.labelKey);
            if (tab.primary) {
              return (
                <Link key={tab.href} href={tab.href} className={`primary-tab ${active ? "active" : ""}`}>
                  <span className="icon-wrap">
                    <span className="icon">
                      <tab.Icon />
                    </span>
                  </span>
                  {label}
                </Link>
              );
            }
            return (
              <Link key={tab.href} href={tab.href} className={active ? "active" : ""}>
                <span className="icon">
                  <tab.Icon />
                </span>
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            className={`bottom-nav-more ${moreOpen ? "active" : ""}`}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <span className="icon">
              <MoreIcon />
            </span>
            {t("navMore")}
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="sheet-card" ref={sheetRef} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-group-label">{t("menuGroupAccount")}</div>
            <div className="sheet-grid">
              <button type="button" className="sheet-item" onClick={() => go("/settings")}>
                <SettingsIcon size={20} /> {t("navSettings")}
              </button>
              {isAdmin && (
                <button type="button" className="sheet-item" onClick={() => go("/users")}>
                  <UsersIcon size={20} /> {t("navUsers")}
                </button>
              )}
              <button
                type="button"
                className="sheet-item"
                onClick={() => {
                  setMoreOpen(false);
                  setBugReportOpen(true);
                }}
              >
                <BugIcon size={20} /> {t("navBugReport")}
              </button>
            </div>

            <div style={{ textAlign: "left", fontSize: 12, color: "var(--color-text-muted)", marginTop: 16 }}>
              {t("appName")} v{process.env.NEXT_PUBLIC_APP_VERSION}
            </div>
          </div>
        </div>
      )}

      {bugReportOpen && <BugReportModal onClose={() => setBugReportOpen(false)} t={t} />}
    </>
  );
}
