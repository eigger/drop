import { UPLOAD_CHUNK_SIZE_BYTES, type FileMeta } from "@drop/shared";
import { apiFetch, ApiError } from "./api";
import { findPendingUploadFor, savePendingUpload, removePendingUpload } from "./pendingUploads";

export interface UploadProgress {
  loaded: number;
  total: number;
}

const MAX_CHUNK_RETRIES = 3;

async function errorFromResponse(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const message = typeof body?.error === "string" ? body.error : `요청 실패 (${res.status})`;
  return new ApiError(message, res.status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initUpload(file: File): Promise<string> {
  const initRes = await apiFetch("/api/files/uploads", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      totalSize: file.size,
    }),
  });
  if (!initRes.ok) throw await errorFromResponse(initRes);
  const { uploadId } = (await initRes.json()) as { uploadId: string };
  return uploadId;
}

// 이전에 중단된 것과 같은 파일(이름+크기)이면, 서버에 아직 그 업로드 세션이 남아있는지
// 확인해서 있으면 이미 받은 바이트 이후부터 이어간다. 서버가 재시작돼 세션이 사라졌으면
// (인메모리라 [[large-file-upload]] 참고) 조용히 새 업로드로 넘어간다.
async function resolveStartingPoint(file: File): Promise<{ uploadId: string; offset: number; index: number }> {
  const pending = findPendingUploadFor(file);
  if (pending) {
    const statusRes = await apiFetch(`/api/files/uploads/${pending.uploadId}`);
    if (statusRes.ok) {
      const status = (await statusRes.json()) as { receivedBytes: number; nextChunkIndex: number };
      return { uploadId: pending.uploadId, offset: status.receivedBytes, index: status.nextChunkIndex };
    }
    removePendingUpload(pending.uploadId);
  }
  return { uploadId: await initUpload(file), offset: 0, index: 0 };
}

// 대용량 파일을 8MB 조각으로 나눠서 순서대로 올린다 — 파일 하나를 통째로 fetch에 실으면
// 느린 모바일 네트워크에서 한 번의 끊김으로 전체를 처음부터 다시 보내야 한다. 청크 단위
// 재시도로 그 비용을 줄이고, 탭/앱이 통째로 죽어도(모바일 백그라운드) 같은 파일을 다시
// 선택하면 이어 올릴 수 있도록 진행 상황을 localStorage에 남긴다.
export async function uploadFileInChunks(
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<FileMeta> {
  const { uploadId, offset: startOffset, index: startIndex } = await resolveStartingPoint(file);

  savePendingUpload({
    uploadId,
    filename: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  });
  if (startOffset > 0) onProgress?.({ loaded: startOffset, total: file.size });

  let offset = startOffset;
  let index = startIndex;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + UPLOAD_CHUNK_SIZE_BYTES);

    let attempt = 0;
    for (;;) {
      const chunkRes = await apiFetch(`/api/files/uploads/${uploadId}/chunks/${index}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
      });
      if (chunkRes.ok) break;
      attempt += 1;
      if (attempt >= MAX_CHUNK_RETRIES) throw await errorFromResponse(chunkRes);
      await sleep(500 * attempt);
    }

    offset += chunk.size;
    index += 1;
    savePendingUpload({ uploadId, filename: file.name, size: file.size, mimeType: file.type || "application/octet-stream" });
    onProgress?.({ loaded: offset, total: file.size });
  }

  const completeRes = await apiFetch(`/api/files/uploads/${uploadId}/complete`, { method: "POST" });
  if (!completeRes.ok) throw await errorFromResponse(completeRes);
  removePendingUpload(uploadId);
  return (await completeRes.json()) as FileMeta;
}
