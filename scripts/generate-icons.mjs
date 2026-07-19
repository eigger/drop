import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ICONS_DIR = path.join(import.meta.dirname, "..", "apps/web/public/icons");

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  const svg = await readFile(path.join(ICONS_DIR, "icon.svg"));

  await sharp(svg).resize(192, 192).png().toFile(path.join(ICONS_DIR, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(ICONS_DIR, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(ICONS_DIR, "apple-touch-icon.png"));

  // 마스커블 아이콘은 OS가 원형/사각형 등으로 잘라내므로 안전 영역(가장자리 여백)을 더 준다.
  const maskable = await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1d5fa8" } })
    .composite([{ input: await sharp(svg).resize(360, 360).toBuffer(), gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(path.join(ICONS_DIR, "icon-maskable-512.png"), maskable);

  console.log("generated icons in", ICONS_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
