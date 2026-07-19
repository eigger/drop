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
