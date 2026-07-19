import type { FastifyInstance } from "fastify";
import { storeUploadedFile } from "./files.js";

// 안드로이드 공유 시트("카톡/갤러리 → drop")에서 오는 요청은 OS/브라우저가 폼을 직접 POST하기
// 때문에 JS로 Authorization 헤더를 못 붙인다. app.authenticate가 쿠키(drop_session)로도
// 인증을 허용하므로 여기선 별도 처리 없이 동일한 preHandler를 그대로 쓴다.
export async function shareTargetRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const uploadedById = request.user.sub;

    for await (const file of request.files()) {
      await storeUploadedFile(uploadedById, file);
    }

    // 브라우저가 그대로 렌더링할 수 있도록 같은 오리진의 파일 목록 화면으로 리다이렉트한다.
    return reply.redirect(303, "/");
  });
}
