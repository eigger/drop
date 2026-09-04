import type { MetadataRoute } from "next";

import { withBasePath } from "../lib/base-path";

// 정적 public/manifest.webmanifest 였는데 라우트로 옮겼다 — public/ 파일에는 basePath가
// 붙지 않아서, 서브패스 배포(Home Assistant Ingress 포함)에서는 start_url·아이콘·공유 시트
// 액션이 전부 앱 밖을 가리켰다. 여기서 그리면 프리픽스가 값에 그대로 박힌다.

// share_target은 아직 표준 등재 전이라 Next의 Manifest 타입에 없다. 이 앱의 핵심 기능이므로
// 타입만 넓혀서 그대로 내보낸다.
type ShareTargetManifest = MetadataRoute.Manifest & {
  share_target: {
    action: string;
    method: string;
    enctype: string;
    params: {
      title: string;
      text: string;
      url: string;
      files: { name: string; accept: string[] }[];
    };
  };
};

export default function manifest(): ShareTargetManifest {
  return {
    name: "Drop",
    short_name: "Drop",
    description: "모바일 ↔ PC 파일 중계",
    start_url: withBasePath("/"),
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    orientation: "portrait",
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      {
        src: withBasePath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    share_target: {
      action: withBasePath("/api/share-target"),
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [{ name: "files", accept: ["*/*"] }],
      },
    },
    // trailingSlash 설정 때문에 슬래시 없는 주소는 308이 된다 — 바로 그 주소로 열도록 붙여둔다.
    shortcuts: [{ name: "업로드", short_name: "업로드", url: withBasePath("/upload/") }],
  };
}
