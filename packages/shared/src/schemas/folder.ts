import { z } from "zod";
import { fileMetaSchema } from "./file.js";

export const folderMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string(),
});

export type FolderMeta = z.infer<typeof folderMetaSchema>;

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().nullable().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

// 특정 폴더(또는 parentId 없으면 루트) 하나를 열었을 때 화면에 필요한 걸 한 번에 담아 보낸다 —
// 폴더 정보, 루트까지의 경로(breadcrumbs), 하위 폴더, 그 폴더에 바로 들어있는 파일.
export const folderContentsSchema = z.object({
  folder: folderMetaSchema.nullable(),
  breadcrumbs: z.array(folderMetaSchema),
  subfolders: z.array(folderMetaSchema),
  files: z.array(fileMetaSchema),
});

export type FolderContents = z.infer<typeof folderContentsSchema>;
