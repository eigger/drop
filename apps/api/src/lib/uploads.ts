import { unlink } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
export const THUMB_DIR = path.join(UPLOAD_DIR, "thumbnails");
// 청크 업로드 진행 중인 임시 조각 파일. UPLOAD_DIR과 같은 파일시스템에 둬야 완료 시
// rename()으로 즉시(복사 없이) 최종 위치로 옮길 수 있다.
export const TEMP_DIR = path.join(UPLOAD_DIR, "tmp");

// 청크 업로드가 기본 경로라 개별 요청은 청크 하나만큼만 메모리에 올라간다 — 그래서 총 용량
// 상한을 넉넉하게(기본 10GB) 잡아도 서버 메모리에는 영향이 없다.
export const FILE_SIZE_LIMIT_BYTES = Number(process.env.FILE_SIZE_LIMIT_MB ?? 10240) * 1024 * 1024;

// 파일이 이미 없어도(수동 삭제 등) 조용히 넘어간다 — DB 정리가 목적이지 파일 존재를
// 보장하는 게 목적이 아니다.
export async function deleteStoredFile(storedName: string): Promise<void> {
  await unlink(path.join(UPLOAD_DIR, storedName)).catch(() => {});
}

export async function deleteThumbnail(thumbnailName: string): Promise<void> {
  await unlink(path.join(THUMB_DIR, thumbnailName)).catch(() => {});
}
