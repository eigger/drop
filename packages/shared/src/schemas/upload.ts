import { z } from "zod";

// 클라이언트와 서버가 같은 청크 크기를 기준으로 진행률/재시도 로직을 맞추기 위해 공유한다.
export const UPLOAD_CHUNK_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export const uploadInitSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  totalSize: z.number().int().positive(),
});

export type UploadInitInput = z.infer<typeof uploadInitSchema>;
