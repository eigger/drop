import type { FastifyInstance } from "fastify";
import type { Folder } from "@prisma/client";
import { createFolderSchema } from "@drop/shared";
import { prisma } from "../lib/prisma.js";
import { t } from "../lib/i18n.js";
import { toFileMeta } from "./files.js";

function toFolderMeta(folder: { id: string; name: string; parentId: string | null; createdAt: Date }) {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
  };
}

async function breadcrumbsFor(folderId: string): Promise<ReturnType<typeof toFolderMeta>[]> {
  const crumbs: ReturnType<typeof toFolderMeta>[] = [];
  let currentId: string | null = folderId;
  while (currentId) {
    const folder: Folder | null = await prisma.folder.findUnique({ where: { id: currentId } });
    if (!folder) break;
    crumbs.unshift(toFolderMeta(folder));
    currentId = folder.parentId;
  }
  return crumbs;
}

// 특정 폴더(또는 루트)를 열었을 때 화면이 필요로 하는 걸 한 번에 모아서 준다: 폴더 자체
// 정보, 루트까지의 경로, 하위 폴더, 그 폴더에 바로 들어있는(휴지통 제외) 파일.
async function folderContents(folderId: string | null) {
  const [folder, subfolders, files] = await Promise.all([
    folderId ? prisma.folder.findUnique({ where: { id: folderId } }) : Promise.resolve(null),
    prisma.folder.findMany({ where: { parentId: folderId }, orderBy: { name: "asc" } }),
    prisma.file.findMany({
      where: { folderId, deletedAt: null },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const breadcrumbs = folderId ? await breadcrumbsFor(folderId) : [];
  return {
    folder: folder ? toFolderMeta(folder) : null,
    breadcrumbs,
    subfolders: subfolders.map(toFolderMeta),
    files: files.map(toFileMeta),
  };
}

// 폴더를 지우면 그 안(하위 폴더까지 재귀적으로)의 파일은 전부 휴지통으로 보내고 나서 폴더
// 행만 지운다 — File.folderId가 onDelete: SetNull이라 폴더가 사라져도 파일 자체는 남아있고
// 휴지통에서 복원할 수 있다. 하위 폴더 행 자체는 Folder.parentId의 onDelete: Cascade가
// 알아서 정리해주므로 여기서는 "지울 폴더 id 전부"만 모으면 된다.
async function collectDescendantFolderIds(rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.folder.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }
  return ids;
}

export async function folderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/root", async () => folderContents(null));

  // 폴더 이동(move) 피커에서 전체 트리를 한 번에 그리기 위한 평면 목록.
  app.get("/all", async () => {
    const folders = await prisma.folder.findMany({ orderBy: { name: "asc" } });
    return folders.map(toFolderMeta);
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) return reply.code(404).send({ error: t("folderNotFound", request.locale) });
    return folderContents(id);
  });

  app.post("/", async (request, reply) => {
    const parsed = createFolderSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { name, parentId } = parsed.data;
    if (parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: parentId } });
      if (!parent) return reply.code(404).send({ error: t("parentFolderNotFound", request.locale) });
    }

    const folder = await prisma.folder.create({
      data: { name, parentId: parentId ?? null, createdById: request.user.sub },
    });
    return reply.code(201).send(toFolderMeta(folder));
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) return reply.code(404).send({ error: t("folderNotFound", request.locale) });

    const folderIds = await collectDescendantFolderIds(id);
    await prisma.file.updateMany({
      where: { folderId: { in: folderIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await prisma.folder.delete({ where: { id } }); // 하위 폴더는 onDelete: Cascade로 함께 삭제된다
    return reply.code(204).send();
  });
}
