import sharp from "sharp";
import type { Readable } from "node:stream";

const THUMBNAIL_DIMENSION = 400;

// 원본 파일은 그대로 저장하고, 이미지일 때만 목록에서 쓸 작은 미리보기(썸네일)를 별도로 만든다.
// stash의 imageProcessing과 달리 원본을 리사이즈/재인코딩하지 않는다 — drop은 사진 전용이
// 아니라 임의 파일을 다루는 범용 저장소라 원본 보존이 우선이다.
// 디스크 경로를 받아 sharp가 내부적으로 스트리밍 디코딩하게 한다 — 원본을 다시 버퍼로 읽어
// 들이면 대용량 이미지 하나로 메모리가 튈 수 있다. 반환값도 스트림이라 쓰는 쪽 역시 버퍼링 없이
// 그대로 디스크에 흘려보낼 수 있다.
export function generateThumbnail(sourcePath: string): Readable {
  return sharp(sourcePath)
    .rotate()
    .resize({
      width: THUMBNAIL_DIMENSION,
      height: THUMBNAIL_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 70 });
}
