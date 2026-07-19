import { randomUUID } from "node:crypto";
import { existsSync, createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink, appendFile, rename } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import archiver from "archiver";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { uploadInitSchema, UPLOAD_CHUNK_SIZE_BYTES, moveFileSchema, previewKindForMimeType } from "@drop/shared";
import { prisma } from "../lib/prisma.js";
import { generateThumbnail } from "../lib/imageProcessing.js";
import { UPLOAD_DIR, THUMB_DIR, TEMP_DIR, FILE_SIZE_LIMIT_BYTES, deleteStoredFile, deleteThumbnail } from "../lib/uploads.js";
import { createUploadSession, getUploadSession, deleteUploadSession } from "../lib/uploadSessions.js";
import { uniqueName } from "../lib/uniqueName.js";
import { uniqueZipEntryName } from "../lib/zipNaming.js";
import { t } from "../lib/i18n.js";

export class FileTooLargeError extends Error {}

// 업로드는 항상 루트에 떨어지므로([[project-overview]]/폴더 기능 결정) 루트에 이미 같은
// 이름이 있으면 덮어쓰지 않고 "이름 (2).확장자" 식으로 살짝 바꿔서 별개 파일로 남긴다.
async function resolveUniqueFilename(filename: string): Promise<string> {
  const existing = await prisma.file.findMany({
    where: { folderId: null, deletedAt: null },
    select: { filename: true },
  });
  return uniqueName(filename, new Set(existing.map((f) => f.filename)));
}

async function finalizeUpload(options: {
  uploadedById: string;
  filename: string;
  mimeType: string;
  destPath: string;
}) {
  const { uploadedById, mimeType, destPath } = options;
  const filename = await resolveUniqueFilename(options.filename);
  const { size } = await stat(destPath);

  let thumbnailName: string | null = null;
  if (mimeType.startsWith("image/")) {
    try {
      // 원본을 다시 버퍼로 읽지 않고 디스크 경로를 그대로 sharp에 넘긴다 — libvips가 내부적으로
      // 스트리밍 처리해서 큰 이미지 하나로 인해 메모리가 튀는 걸 피한다.
      const thumb = generateThumbnail(destPath);
      thumbnailName = `${randomUUID()}.jpg`;
      await mkdir(THUMB_DIR, { recursive: true });
      await pipeline(thumb, createWriteStream(path.join(THUMB_DIR, thumbnailName)));
    } catch {
      thumbnailName = null; // 손상된 이미지 등 — 썸네일 없이 원본만 저장
    }
  }

  return prisma.file.create({
    data: {
      filename,
      storedName: path.basename(destPath),
      thumbnailName,
      mimeType,
      size,
      uploadedById,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
}

// 일반 multipart 업로드(공유 시트, 작은 파일) 경로 — 요청 스트림을 메모리에 올리지 않고
// 디스크로 그대로 흘려보낸다. toBuffer()를 쓰면 대용량 파일 하나로 프로세스 메모리를 전부
// 먹여버릴 수 있다.
export async function storeUploadedFile(uploadedById: string, file: MultipartFile) {
  const ext = path.extname(file.filename) || "";
  const storedName = `${randomUUID()}${ext}`;
  const destPath = path.join(UPLOAD_DIR, storedName);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await pipeline(file.file, createWriteStream(destPath));

  if (file.file.truncated) {
    await unlink(destPath).catch(() => {});
    throw new FileTooLargeError(file.filename);
  }

  return finalizeUpload({ uploadedById, filename: file.filename, mimeType: file.mimetype, destPath });
}

export function toFileMeta(file: {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  thumbnailName: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  folderId: string | null;
  uploadedBy: { id: string; name: string };
}) {
  return {
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    hasThumbnail: file.thumbnailName !== null,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt.toISOString(),
    deletedAt: file.deletedAt ? file.deletedAt.toISOString() : null,
    folderId: file.folderId,
  };
}

export async function fileRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async () => {
    const files = await prisma.file.findMany({
      where: { deletedAt: null },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return files.map(toFileMeta);
  });

  app.get("/trash", async () => {
    const files = await prisma.file.findMany({
      where: { deletedAt: { not: null } },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { deletedAt: "desc" },
    });
    return files.map(toFileMeta);
  });

  // 여러 파일을 한 번에 받을 때 쓴다 — 브라우저(특히 Chrome)는 클릭 한 번에서 나온 자동
  // 다운로드가 여러 개면 "여러 파일 다운로드" 권한을 요구하거나 막아버리는 경우가 많아서,
  // 개별 다운로드 링크를 반복 트리거하는 대신 서버에서 zip 하나로 묶어 단일 다운로드로 보낸다.
  // GET + 인증 쿠키라 다른 다운로드 링크처럼 window.location.href로 그대로 쓸 수 있고,
  // 파일들을 디스크에서 그대로 스트리밍해 담으므로 메모리에 전체를 올리지 않는다.
  app.get("/download-zip", async (request, reply) => {
    const query = request.query as { ids?: string | string[] };
    const ids = !query.ids ? [] : Array.isArray(query.ids) ? query.ids : [query.ids];
    if (ids.length === 0) return reply.code(400).send({ error: t("fileRequired", request.locale) });

    const files = await prisma.file.findMany({ where: { id: { in: ids }, deletedAt: null } });
    if (files.length === 0) return reply.code(404).send({ error: t("fileNotFound", request.locale) });

    reply.type("application/zip");
    reply.header("Content-Disposition", 'attachment; filename="drop-files.zip"');

    const archive = archiver("zip", { zlib: { level: 6 } });
    const usedNames = new Set<string>();
    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file.storedName);
      if (!existsSync(filePath)) continue;
      archive.append(createReadStream(filePath), { name: uniqueZipEntryName(file.filename, usedNames) });
    }
    void archive.finalize();

    return reply.send(archive);
  });

  // 웹 UI의 드래그앤드롭/파일선택 업로드가 아니라, 공유 시트(share_target)나 소형 파일용
  // 단순 multipart 업로드 — 브라우저가 완전히 통제하지 못하는 요청(OS 폼 POST)이 여기로 온다.
  app.post("/", async (request, reply) => {
    const uploadedById = request.user.sub;
    const created: ReturnType<typeof toFileMeta>[] = [];

    try {
      for await (const file of request.files()) {
        const record = await storeUploadedFile(uploadedById, file);
        created.push(toFileMeta(record));
      }
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        const limit = `${Math.floor(FILE_SIZE_LIMIT_BYTES / 1024 / 1024)}MB`;
        return reply.code(413).send({ error: t("fileTooLarge", request.locale, { limit }) });
      }
      // 공유 원본 앱/네트워크가 파일을 다 보내기 전에 스트림을 끊으면 busboy가 여기서
      // "unexpected end of multipart data" 같은 에러를 던진다 — 서버 버그가 아니라 클라이언트
      // 쪽 문제라 재시도 외엔 손쓸 방법이 없지만, 날것의 스택트레이스를 그대로 노출하지 않고
      // 이미 저장된 파일이 몇 개인지는 알려준다.
      app.log.error(
        { err, uploadedBeforeFailure: created.length, contentLength: request.headers["content-length"] },
        "multipart 업로드 중 오류",
      );
      return reply.code(400).send({ error: t("uploadStreamInterrupted", request.locale), uploaded: created });
    }

    if (created.length === 0) {
      return reply.code(400).send({ error: t("fileRequired", request.locale) });
    }
    return reply.code(201).send(created);
  });

  // --- 청크 업로드 (대용량 파일용, 웹 UI 전용) ---
  // 요청 한 번에 청크 하나(기본 8MB)만 실려오므로 파일 총 용량과 무관하게 메모리 사용량이
  // 일정하다. 브라우저가 직접 폼을 못 만드는 공유 시트 업로드에는 쓸 수 없어서(위 POST /와
  // 별개 경로) 웹 UI의 일반 업로드만 이 경로를 쓴다.

  app.post("/uploads", async (request, reply) => {
    const parsed = uploadInitSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { filename, mimeType, totalSize } = parsed.data;
    if (totalSize > FILE_SIZE_LIMIT_BYTES) {
      const limit = `${Math.floor(FILE_SIZE_LIMIT_BYTES / 1024 / 1024)}MB`;
      return reply.code(413).send({ error: t("fileTooLarge", request.locale, { limit }) });
    }

    const session = createUploadSession(request.user.sub, filename, mimeType, totalSize);
    return reply.code(201).send({ uploadId: session.id });
  });

  app.put("/uploads/:uploadId/chunks/:index", async (request, reply) => {
    const { uploadId, index } = request.params as { uploadId: string; index: string };
    const session = getUploadSession(uploadId);
    if (!session) return reply.code(404).send({ error: t("uploadSessionNotFound", request.locale) });

    const chunkIndex = Number(index);
    if (chunkIndex !== session.nextChunkIndex) {
      return reply.code(409).send({
        error: t("uploadChunkOutOfOrder", request.locale, { expectedIndex: session.nextChunkIndex }),
        expectedIndex: session.nextChunkIndex,
      });
    }

    const chunk = request.body as Buffer;
    // 클라이언트가 선언한 청크 크기보다 눈에 띄게 큰 조각은 버그/오남용으로 보고 거부한다.
    if (chunk.length > UPLOAD_CHUNK_SIZE_BYTES * 2) {
      return reply.code(413).send({ error: t("fileTooLarge", request.locale, { limit: "chunk size" }) });
    }
    if (session.receivedBytes + chunk.length > session.totalSize) {
      return reply.code(400).send({ error: t("uploadChunkOverflow", request.locale) });
    }

    await mkdir(TEMP_DIR, { recursive: true });
    await appendFile(session.tempPath, chunk);
    session.receivedBytes += chunk.length;
    session.nextChunkIndex += 1;

    return { receivedBytes: session.receivedBytes, nextChunkIndex: session.nextChunkIndex };
  });

  app.get("/uploads/:uploadId", async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string };
    const session = getUploadSession(uploadId);
    if (!session) return reply.code(404).send({ error: t("uploadSessionNotFound", request.locale) });
    return {
      uploadId: session.id,
      receivedBytes: session.receivedBytes,
      nextChunkIndex: session.nextChunkIndex,
      totalSize: session.totalSize,
    };
  });

  app.post("/uploads/:uploadId/complete", async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string };
    const session = getUploadSession(uploadId);
    if (!session) return reply.code(404).send({ error: t("uploadSessionNotFound", request.locale) });
    if (session.receivedBytes !== session.totalSize) {
      return reply.code(400).send({ error: t("uploadIncomplete", request.locale) });
    }

    const ext = path.extname(session.filename) || "";
    const destPath = path.join(UPLOAD_DIR, `${randomUUID()}${ext}`);
    await mkdir(UPLOAD_DIR, { recursive: true });
    await rename(session.tempPath, destPath); // tmp와 UPLOAD_DIR가 같은 파일시스템이라 즉시 이동된다

    const record = await finalizeUpload({
      uploadedById: session.uploadedById,
      filename: session.filename,
      mimeType: session.mimeType,
      destPath,
    });
    deleteUploadSession(uploadId);

    return reply.code(201).send(toFileMeta(record));
  });

  app.delete("/uploads/:uploadId", async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string };
    const session = getUploadSession(uploadId);
    if (!session) return reply.code(404).send({ error: t("uploadSessionNotFound", request.locale) });

    await unlink(session.tempPath).catch(() => {});
    deleteUploadSession(uploadId);
    return reply.code(204).send();
  });

  app.get("/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });

    const filePath = path.join(UPLOAD_DIR, file.storedName);
    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: t("fileMissingOnDisk", request.locale) });
    }

    reply.type(file.mimeType);
    reply.header(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    return createReadStream(filePath);
  });

  // 파일을 눌렀을 때 새 탭 다운로드 대신 바로 보여주는 용도(이미지/동영상/오디오/PDF/일반
  // 텍스트) — /download와 달리 Content-Disposition을 inline으로 준다. 임의 업로드 파일을
  // 그대로 렌더링하는 거라, 클라이언트가 자칭한 mimeType과 무관하게 previewKindForMimeType가
  // "미리보기 가능"으로 허용한 종류만 inline으로 내려주고 나머지는 강제로 다운로드시킨다 —
  // image/svg+xml(내부 <script> 실행 가능)이나 text/html 같은 걸 그대로 렌더링하면 업로드한
  // 파일이 이 앱 오리진에서 스크립트를 실행하는 저장형 XSS가 된다. nosniff로 브라우저가
  // Content-Type을 무시하고 다른 걸로 추측 렌더링하는 것도 막는다.
  app.get("/:id/preview", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });

    const filePath = path.join(UPLOAD_DIR, file.storedName);
    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: t("fileMissingOnDisk", request.locale) });
    }

    const { size } = await stat(filePath);
    const isPreviewable = previewKindForMimeType(file.mimeType) !== "none";
    const disposition = isPreviewable
      ? `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`
      : `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`;

    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Content-Disposition", disposition);
    reply.type(file.mimeType);

    // Range 지원 — 특히 동영상은 이게 없으면 재생을 위해 파일 전체를 먼저 받아야 해서 탐색
    // (seek)이 안 되고 대용량 영상은 미리보기가 사실상 불가능해진다.
    const rangeHeader = request.headers.range;
    const rangeMatch = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader) : null;
    if (rangeMatch) {
      const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : size - 1;
      if (start > end || start >= size) {
        reply.code(416);
        reply.header("Content-Range", `bytes */${size}`);
        return reply.send();
      }
      reply.code(206);
      reply.header("Accept-Ranges", "bytes");
      reply.header("Content-Range", `bytes ${start}-${end}/${size}`);
      reply.header("Content-Length", end - start + 1);
      return createReadStream(filePath, { start, end });
    }

    reply.header("Accept-Ranges", "bytes");
    reply.header("Content-Length", size);
    return createReadStream(filePath);
  });

  app.get("/:id/thumbnail", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });
    if (!file.thumbnailName) return reply.code(404).send({ error: t("noThumbnail", request.locale) });

    const thumbPath = path.join(THUMB_DIR, file.thumbnailName);
    if (!existsSync(thumbPath)) {
      return reply.code(404).send({ error: t("fileMissingOnDisk", request.locale) });
    }

    reply.type("image/jpeg");
    return createReadStream(thumbPath);
  });

  // 소프트 삭제 — 목록에서 즉시 안 보이게만 하고, 실수로 지운 걸 휴지통에서 되돌릴 수
  // 있게 한다. 디스크의 실제 파일은 영구 삭제(/permanent) 때만 정리한다.
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.file
      .update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { uploadedBy: { select: { id: true, name: true } } },
      })
      .catch(() => null);
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });
    return toFileMeta(file);
  });

  app.post("/:id/move", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = moveFileSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { folderId } = parsed.data;
    if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) return reply.code(404).send({ error: t("folderNotFound", request.locale) });
    }

    const file = await prisma.file
      .update({
        where: { id },
        data: { folderId },
        include: { uploadedBy: { select: { id: true, name: true } } },
      })
      .catch(() => null);
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });
    return toFileMeta(file);
  });

  app.post("/:id/restore", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.file
      .update({
        where: { id },
        data: { deletedAt: null },
        include: { uploadedBy: { select: { id: true, name: true } } },
      })
      .catch(() => null);
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });
    return toFileMeta(file);
  });

  // 휴지통에서의 영구 삭제 — 아직 휴지통에 없는(deletedAt이 null인) 파일은 거부해서, 반드시
  // "삭제 → 휴지통 → 영구 삭제" 두 단계를 거치게 해 실수를 막는다.
  app.delete("/:id/permanent", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return reply.code(404).send({ error: t("fileNotFound", request.locale) });
    if (!file.deletedAt) {
      return reply.code(400).send({ error: t("onlyTrashedCanBePurged", request.locale) });
    }

    await prisma.file.delete({ where: { id } });
    await deleteStoredFile(file.storedName);
    if (file.thumbnailName) await deleteThumbnail(file.thumbnailName);
    return reply.code(204).send();
  });
}
