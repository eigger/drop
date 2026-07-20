import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { UPLOAD_CHUNK_SIZE_BYTES } from "@drop/shared";
import { authRoutes } from "./routes/auth.js";
import { fileRoutes } from "./routes/files.js";
import { folderRoutes } from "./routes/folders.js";
import { shareTargetRoutes } from "./routes/shareTarget.js";
import { localeFromRequest, t } from "./lib/i18n.js";
import { FILE_SIZE_LIMIT_BYTES, UPLOAD_DIR } from "./lib/uploads.js";
import { SESSION_COOKIE_NAME } from "./lib/authCookie.js";
import { sweepStaleUploadSessions } from "./lib/uploadSessions.js";
import { startTrashPurgeJob } from "./jobs/trashPurge.js";
import { prisma } from "./lib/prisma.js";

const app = Fastify({
  logger: true,
  // 청크 업로드(application/octet-stream) 본문이 이 값으로 제한된다 — 청크 하나(기본 8MB)보다
  // 넉넉하게 잡아야 한다. 대용량 파일 자체는 청크로 쪼개 보내므로 이 값과 무관하다.
  bodyLimit: UPLOAD_CHUNK_SIZE_BYTES * 2,
  // 느린 모바일 네트워크에서 큰 파일(공유 시트로 들어오는 multipart, 또는 낱개 청크)을 올릴 때
  // 유휴 타임아웃으로 연결이 끊기지 않도록 요청 타임아웃을 끈다.
  requestTimeout: 0,
});

if (!process.env.JWT_SECRET) {
  app.log.warn("JWT_SECRET이 설정되지 않았습니다. .env를 확인하세요.");
}

await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret-change-me" });
await app.register(multipart, { limits: { fileSize: FILE_SIZE_LIMIT_BYTES } });
// 기본은 전역 미적용 — 무차별 대입 방어가 필요한 로그인 라우트에서만 개별적으로 설정한다.
await app.register(rateLimit, { global: false });

// 청크 업로드 PUT 요청의 본문(raw 바이너리)을 그대로 Buffer로 받는다 — JSON/multipart가
// 아니라서 기본 파서로는 처리되지 않는다.
app.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_request, payload, done) => {
  done(null, payload);
});

// 프론트가 보내는 X-Locale 헤더(사용자가 앱에서 고른 언어)로 에러 메시지 언어를 정한다.
app.decorateRequest("locale", "ko");
app.addHook("onRequest", async (request) => {
  request.locale = localeFromRequest(request);
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
    return;
  } catch {
    // 공유 시트(share_target) 업로드처럼 OS가 직접 폼 POST를 보내는 요청은 Authorization
    // 헤더를 못 실어 보내므로, 로그인 시 함께 심어둔 httpOnly 쿠키로도 인증을 허용한다.
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (token) {
      try {
        const decoded = app.jwt.verify<{ sub: string; role: "ADMIN" | "GENERAL" }>(token);
        request.user = decoded;
        return;
      } catch {
        // fall through to 401
      }
    }
    reply.code(401).send({ error: "unauthorized" });
  }
});

app.decorate("requireAdmin", async (request, reply) => {
  if (request.user.role !== "ADMIN") {
    reply.code(403).send({ error: "admin only" });
  }
});

app.get("/health", async () => ({ status: "ok" }));

app.get("/api/files/qr-download", async (request, reply) => {
  const query = request.query as { token?: string };
  if (!query.token) {
    return reply.code(400).send({ error: t("tokenRequired", request.locale) });
  }

  try {
    const decoded = app.jwt.verify<{ fileId: string; action: string }>(query.token);
    if (decoded.action !== "qr-download") {
      return reply.code(403).send({ error: "Invalid token action" });
    }

    const file = await prisma.file.findUnique({ where: { id: decoded.fileId } });
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
  } catch (err) {
    return reply.code(401).send({ error: t("invalidToken", request.locale) });
  }
});

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(fileRoutes, { prefix: "/api/files" });
await app.register(folderRoutes, { prefix: "/api/folders" });
await app.register(shareTargetRoutes, { prefix: "/api/share-target" });

setInterval(() => {
  sweepStaleUploadSessions().catch((err) => app.log.error(err, "청크 업로드 세션 정리 실패"));
}, 60 * 60 * 1000).unref();

startTrashPurgeJob();

const port = Number(process.env.PORT ?? 8080);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
