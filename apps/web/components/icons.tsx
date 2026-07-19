import type { SVGProps } from "react";

// 이모지는 폰트/OS마다 렌더링이 달라서 쓰지 않는다 — 앱 전체에서 아이콘은 항상 이 stroke
// 스타일의 SVG로 통일한다.
function iconProps(size: number): SVGProps<SVGSVGElement> {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: size,
    height: size,
  };
}

export function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
      <path d="M10 20.5V15h4v5.5" />
    </svg>
  );
}

export function FilesIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function UploadIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 16V5" />
      <path d="M7 9.5 12 4.5 17 9.5" />
      <path d="M5 16v2.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  );
}

export function TrashIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function MoreIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function SettingsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function UsersIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15 13.2c2 .3 3.7 1.9 3.7 4.3" />
    </svg>
  );
}

export function FolderIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 7a1 1 0 0 1 1-1h4.5l1.5 1.5H19a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" />
    </svg>
  );
}

export function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3.5v10" />
      <path d="M8 9.5l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function MoveIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M13 5l6 7-6 7" />
      <path d="M19 12H4" />
    </svg>
  );
}

export function RestoreIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4.5 9a7.5 7.5 0 1 1 1.8 7.8" />
      <path d="M4.5 4.5v5h5" />
    </svg>
  );
}

export function ImageTypeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-5 3.5 3.5L16.5 11 20 15" />
    </svg>
  );
}

export function VideoTypeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3.5" y="5.5" width="13" height="13" rx="2" />
      <path d="M16.5 10.5 20.5 8v8l-4-2.5" />
    </svg>
  );
}

export function AudioTypeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M9 17V6.5l10-2V15" />
      <circle cx="6.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </svg>
  );
}

export function DocumentTypeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6.5 3.5h7L18 8v12a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M8 12.5h8M8 15.5h8M8 18h5" />
    </svg>
  );
}

export function OtherTypeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}
