"use client";

// 업로드 도중 탭/앱이 강제 종료돼도(특히 iOS에서 백그라운드로 오래 두면 흔함) 어디까지
// 올라갔는지 알 수 있도록 업로드 세션을 localStorage에 남겨둔다. 실제 파일 바이트는
// 저장할 수 없으니(File 객체는 새로고침 후 되살릴 수 없다) "이어서 하려면 같은 파일을
// 다시 선택해 달라"는 방식으로만 재개를 지원한다 — 파일명+크기로 매칭한다.
export interface PendingUpload {
  uploadId: string;
  filename: string;
  size: number;
  mimeType: string;
  updatedAt: number;
}

const STORAGE_KEY = "drop_pending_uploads";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 서버의 세션 정리 주기(24시간)와 맞춘다

function readAll(): PendingUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingUpload[];
    const now = Date.now();
    const fresh = parsed.filter((p) => now - p.updatedAt < MAX_AGE_MS);
    if (fresh.length !== parsed.length) writeAll(fresh);
    return fresh;
  } catch {
    return [];
  }
}

function writeAll(entries: PendingUpload[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getPendingUploads(): PendingUpload[] {
  return readAll();
}

export function savePendingUpload(entry: Omit<PendingUpload, "updatedAt">): void {
  const all = readAll().filter((p) => p.uploadId !== entry.uploadId);
  all.push({ ...entry, updatedAt: Date.now() });
  writeAll(all);
}

export function removePendingUpload(uploadId: string): void {
  writeAll(readAll().filter((p) => p.uploadId !== uploadId));
}

// 파일명+크기가 같으면 "같은 파일"로 보고 이어 올리기를 시도한다 — 완벽한 보장은 아니지만
// (다른 파일이 우연히 이름·크기가 같을 수 있음), 실제 바이트를 비교하려면 전체를 다시 읽어야
// 해서 이어 올리기의 이점이 사라진다. 개인용 셀프호스팅 규모에서는 충분한 타협이다.
export function findPendingUploadFor(file: File): PendingUpload | undefined {
  return readAll().find((p) => p.filename === file.name && p.size === file.size);
}
