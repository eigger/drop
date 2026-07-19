import { randomUUID } from "node:crypto";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { TEMP_DIR } from "./uploads.js";

export interface UploadSession {
  id: string;
  uploadedById: string;
  filename: string;
  mimeType: string;
  totalSize: number;
  receivedBytes: number;
  nextChunkIndex: number;
  tempPath: string;
  createdAt: number;
}

// 단일 컨테이너로 셀프호스팅하는 개인용 서비스라 세션을 프로세스 메모리에만 둔다 — 여러
// 인스턴스로 수평 확장할 계획이 없으니 Redis 등 외부 저장소를 끌어들일 필요가 없다.
const sessions = new Map<string, UploadSession>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createUploadSession(
  uploadedById: string,
  filename: string,
  mimeType: string,
  totalSize: number,
): UploadSession {
  const id = randomUUID();
  const session: UploadSession = {
    id,
    uploadedById,
    filename,
    mimeType,
    totalSize,
    receivedBytes: 0,
    nextChunkIndex: 0,
    tempPath: path.join(TEMP_DIR, `${id}.part`),
    createdAt: Date.now(),
  };
  sessions.set(id, session);
  return session;
}

export function getUploadSession(id: string): UploadSession | undefined {
  return sessions.get(id);
}

export function deleteUploadSession(id: string): void {
  sessions.delete(id);
}

// 브라우저가 완료/취소 요청 없이 사라진(탭 닫힘 등) 업로드 세션의 임시 조각 파일이 디스크에
// 계속 쌓이는 걸 막는다. 정교한 잡 큐 대신 setInterval 하나로 충분한 규모다.
export async function sweepStaleUploadSessions(): Promise<void> {
  const now = Date.now();
  for (const session of sessions.values()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      await unlink(session.tempPath).catch(() => {});
      sessions.delete(session.id);
    }
  }
}
