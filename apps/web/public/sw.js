const SHELL_CACHE = "drop-shell-v7";

// public/ 파일은 빌드 시 basePath가 붙지 않는다. 대신 서비스워커는 자기 스코프를 알고 있으므로
// 거기서 배포 프리픽스를 그대로 얻는다 — 루트 배포면 "", /drop 아래면 "/drop".
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/+$/, "");
const url = (path) => `${BASE_PATH}${path}`;

/** 프리픽스를 뗀, 앱 기준 경로. lib/base-path.ts `stripBasePath`와 같은 규칙. */
function appPath(requestUrl) {
  const { pathname } = new URL(requestUrl);
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length) || "/";
  return pathname;
}

// 주의: 뒤 슬래시가 있어야 한다. trailingSlash 때문에 슬래시 없는 주소는 308이 되고,
// cache.addAll은 리다이렉트된 응답을 저장하지 못해 목록 전체가 통째로 실패한다.
const SHELL_ASSETS = ["/", "/login/", "/files/", "/upload/", "/settings/", "/manifest.webmanifest"].map(url);

// 안드로이드 공유 시트로 들어오는 파일을 앱 화면(진행률 UI)까지 들고 가기 위해 IndexedDB에
// 잠깐 보관한다. lib/shareTargetDb.ts가 같은 DB/스토어/키로 읽어간다 — 이름을 바꾸면 함께 바꿔야 한다.
const SHARE_DB_NAME = "drop-share-target";
const SHARE_DB_VERSION = 1;
const SHARE_STORE_NAME = "shared-files";
const SHARE_KEY = "pending";

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, SHARE_DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(SHARE_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSharedFiles(files) {
  const db = await openShareDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE_NAME, "readwrite");
    tx.objectStore(SHARE_STORE_NAME).put(files, SHARE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// 공유 시트 POST를 가로채 파일을 IndexedDB에 저장하고 /upload로 보낸다. formData 파싱이나
// IndexedDB 저장이 실패하면(용량 초과 등) 원본 요청을 그대로 백엔드로 흘려보내 기존 방식대로
// 처리되게 한다 — 진행률 화면은 못 띄우지만 업로드 자체는 성공시키는 게 우선이다.
async function handleShareTarget(event) {
  const fallbackRequest = event.request.clone();
  try {
    const formData = await event.request.formData();
    const files = formData.getAll("files").filter((f) => f instanceof File);

    if (files.length === 0) {
      return Response.redirect(url("/upload/"), 303);
    }

    await saveSharedFiles(files);
    return Response.redirect(url("/upload/?share-target=1"), 303);
  } catch (err) {
    return fetch(fallbackRequest);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

// API 응답은 항상 최신이어야 하므로 절대 캐시하지 않는다 — 파일 목록/업로드 상태가 stale하면
// 안 되기 때문. 앱 셸(정적 페이지)만 오프라인 폴백용으로 캐시한다.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const path = appPath(request.url);

  if (request.method === "POST" && path === "/api/share-target") {
    event.respondWith(handleShareTarget(event));
    return;
  }

  if (request.method !== "GET") return;
  if (path.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((res) => res || caches.match(url("/")))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
