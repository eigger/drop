"use client";

// public/sw.js가 안드로이드 공유 시트 POST에서 받은 파일을 이 DB/스토어/키에 저장해둔다.
// 이름을 바꾸면 sw.js도 함께 바꿔야 한다.
const SHARE_DB_NAME = "drop-share-target";
const SHARE_DB_VERSION = 1;
const SHARE_STORE_NAME = "shared-files";
const SHARE_KEY = "pending";

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, SHARE_DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(SHARE_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getSharedFiles(): Promise<File[]> {
  const db = await openShareDb();
  const files = await new Promise<File[]>((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE_NAME, "readonly");
    const req = tx.objectStore(SHARE_STORE_NAME).get(SHARE_KEY);
    req.onsuccess = () => resolve((req.result as File[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return files;
}

export async function clearSharedFiles(): Promise<void> {
  const db = await openShareDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE_NAME, "readwrite");
    tx.objectStore(SHARE_STORE_NAME).delete(SHARE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
