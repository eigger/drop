import path from "node:path";

// 같은 폴더가 아닌 여러 파일을 한꺼번에 선택해 zip으로 묶으면 이름이 겹칠 수 있다(예: 서로
// 다른 폴더의 "photo.jpg" 두 개) — zip 안에서 뒤엣것이 앞엣것을 덮어쓰지 않도록 겹치면
// "이름 (2).확장자" 식으로 살짝 바꿔서 유일하게 만든다.
export function uniqueZipEntryName(filename: string, used: Set<string>): string {
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
