import { z } from "zod";

export const fileMetaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  hasThumbnail: z.boolean(),
  uploadedBy: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
  folderId: z.string().nullable(),
});

export type FileMeta = z.infer<typeof fileMetaSchema>;

export const moveFileSchema = z.object({
  folderId: z.string().nullable(),
});

export type MoveFileInput = z.infer<typeof moveFileSchema>;

export const bulkFileIdsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type BulkFileIdsInput = z.infer<typeof bulkFileIdsSchema>;

export const fileTypeCategories = ["image", "video", "audio", "document", "other"] as const;
export type FileTypeCategory = (typeof fileTypeCategories)[number];

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

export function categorizeFileType(mimeType: string): FileTypeCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("text/") || mimeType.startsWith("application/vnd.") || DOCUMENT_MIME_TYPES.has(mimeType)) {
    return "document";
  }
  return "other";
}

export const fileStatsSchema = z.object({
  totalFiles: z.number(),
  totalSize: z.number(),
  byType: z.record(z.enum(fileTypeCategories), z.object({ count: z.number(), size: z.number() })),
  disk: z.object({ total: z.number(), free: z.number(), used: z.number() }),
});

export type FileStats = z.infer<typeof fileStatsSchema>;
