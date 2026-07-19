import path from "node:path";

// 이름이 겹치면 덮어쓰는 대신 "이름 (2).확장자" 식으로 살짝 바꿔서 유일하게 만든다 — zip
// 다운로드(서로 다른 폴더의 동명 파일)와 업로드(같은 폴더에 동명 파일 재업로드) 둘 다 같은
// 규칙을 쓴다.
export function uniqueName(filename: string, used: Set<string>): string {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }

  const ext = path.extname(filename);
  const base = filename.slice(0, filename.length - ext.length);
  let attempt = 2;
  let candidate = `${base} (${attempt})${ext}`;
  while (used.has(candidate)) {
    attempt += 1;
    candidate = `${base} (${attempt})${ext}`;
  }
  used.add(candidate);
  return candidate;
}
