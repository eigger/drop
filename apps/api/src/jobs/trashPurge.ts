import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { deleteStoredFile, deleteThumbnail } from "../lib/uploads.js";

// 휴지통에 30일 넘게 남아있는 파일은 실수로 지운 걸로 보고 자동으로 영구 삭제한다 —
// 사용자가 매번 휴지통을 비우러 들어올 필요가 없게 하기 위함. stash의 동일한 정책을 그대로 가져왔다.
const RETENTION_DAYS = 30;

export async function purgeOldTrash(): Promise<void> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - RETENTION_DAYS);

  const stale = await prisma.file.findMany({
    where: { deletedAt: { not: null, lte: threshold } },
  });

  for (const file of stale) {
    await prisma.file.delete({ where: { id: file.id } });
    await deleteStoredFile(file.storedName);
    if (file.thumbnailName) await deleteThumbnail(file.thumbnailName);
  }
}

export function startTrashPurgeJob(): void {
  purgeOldTrash().catch((err) => console.error("[trash-purge] initial run failed", err));
  // 매일 새벽 4시
  cron.schedule("0 4 * * *", () => {
    purgeOldTrash().catch((err) => console.error("[trash-purge] scheduled run failed", err));
  });
}
