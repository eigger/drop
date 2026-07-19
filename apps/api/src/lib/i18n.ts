import type { FastifyRequest } from "fastify";

export type ApiLocale = "ko" | "en";

// 프론트엔드가 보내는 X-Locale 헤더(사용자가 앱에서 고른 언어)를 최우선으로 쓴다 — 브라우저의
// Accept-Language(OS/브라우저 설정)는 앱 안에서 고른 언어와 다를 수 있어서 신뢰하지 않는다.
export function localeFromRequest(request: FastifyRequest): ApiLocale {
  const header = request.headers["x-locale"];
  const value = Array.isArray(header) ? header[0] : header;
  return value === "en" ? "en" : "ko";
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

const MESSAGES = {
  bootstrapDisabled: {
    ko: "이미 관리자 계정이 있어 초기 설정을 할 수 없습니다",
    en: "Bootstrap is disabled — an admin account already exists",
  },
  invalidCredentials: { ko: "이메일 또는 비밀번호가 올바르지 않습니다", en: "Invalid email or password" },
  cannotDeleteSelf: { ko: "본인 계정은 삭제할 수 없습니다", en: "You cannot delete your own account" },
  currentPasswordRequired: { ko: "현재 비밀번호를 입력하세요", en: "Current password is required" },
  userNotFound: { ko: "사용자를 찾을 수 없습니다", en: "User not found" },
  incorrectCurrentPassword: { ko: "현재 비밀번호가 올바르지 않습니다", en: "Current password is incorrect" },

  fileRequired: { ko: "파일이 없습니다", en: "No file provided" },
  fileTooLarge: { ko: "파일이 너무 큽니다 (최대 {limit})", en: "File too large (max {limit})" },
  fileNotFound: { ko: "파일을 찾을 수 없습니다", en: "File not found" },
  fileMissingOnDisk: { ko: "디스크에서 파일을 찾을 수 없습니다", en: "File missing on disk" },
  noThumbnail: { ko: "썸네일이 없습니다", en: "No thumbnail for this file" },

  uploadSessionNotFound: { ko: "업로드 세션을 찾을 수 없습니다", en: "Upload session not found" },
  uploadChunkOutOfOrder: {
    ko: "청크 순서가 올바르지 않습니다 (다음 조각: {expectedIndex})",
    en: "Chunk out of order (expected index {expectedIndex})",
  },
  uploadChunkOverflow: { ko: "업로드된 용량이 선언한 파일 크기를 초과합니다", en: "Uploaded bytes exceed the declared file size" },
  uploadIncomplete: { ko: "아직 모든 조각이 도착하지 않았습니다", en: "Not all chunks have arrived yet" },

  onlyTrashedCanBePurged: {
    ko: "휴지통에 있는 파일만 영구 삭제할 수 있습니다",
    en: "Only files already in the trash can be permanently deleted",
  },

  folderNotFound: { ko: "폴더를 찾을 수 없습니다", en: "Folder not found" },
  parentFolderNotFound: { ko: "상위 폴더를 찾을 수 없습니다", en: "Parent folder not found" },
} as const;

export type ApiMessageKey = keyof typeof MESSAGES;

export function t(key: ApiMessageKey, locale: ApiLocale, params?: Record<string, string | number>): string {
  return interpolate(MESSAGES[key][locale], params);
}
