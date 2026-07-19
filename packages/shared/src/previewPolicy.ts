export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text" | "none";

// API(어떤 파일을 inline으로 내려줄지, Content-Disposition을 뭘로 할지)와 웹(어떤 <img>/<video>/
// <iframe>을 렌더링할지)이 정확히 같은 기준을 써야 한다 — 둘이 어긋나면 서버는 다운로드를
// 강제하는데 화면은 미리보기를 시도하는 식의 불일치가 생긴다. image/svg+xml은 <img>로 렌더링돼도
// 일부 상황에서 내부 <script>가 실행될 수 있어 의도적으로 제외한다 — 미리보기 없이 다운로드만.
export function previewKindForMimeType(mimeType: string): PreviewKind {
  if (mimeType === "image/svg+xml") return "none";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "text/plain") return "text";
  return "none";
}
