import type { FastifyInstance } from "fastify";
import { storeUploadedFile } from "./files.js";

// 안드로이드 공유 시트("카톡/갤러리 → drop")에서 오는 요청은 OS/브라우저가 폼을 직접 POST하기
// 때문에 JS로 Authorization 헤더를 못 붙인다. app.authenticate가 쿠키(drop_session)로도
// 인증을 허용하므로 여기선 별도 처리 없이 동일한 preHandler를 그대로 쓴다.
export async function shareTargetRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const uploadedById = request.user.sub;
    let uploaded = 0;

    try {
      for await (const file of request.files()) {
        await storeUploadedFile(uploadedById, file);
        uploaded += 1;
      }
    } catch (err) {
      // 공유 시트는 OS가 직접 폼을 붙여 넣는 요청이라, 카카오톡처럼 공유 원본 앱이 파일
      // 바이트를 서빙하다가 느려지거나 중간에 끊기면(네트워크, 원본 앱 종료 등) 여기서
      // busboy가 "unexpected end of multipart data" 같은 에러를 던진다 — 서버 버그가
      // 아니라 클라이언트 쪽 스트림이 끊긴 상황이라 재현/수정이 안 되지만, 최소한 사용자가
      // 날것의 500 에러 화면을 보는 대신 앱으로 돌아가게는 만들어야 한다. 다음에 또
      // 재현되면 원인을 좁힐 수 있게 진단 정보를 남긴다.
      app.log.error(
        {
          err,
          uploadedBeforeFailure: uploaded,
          contentLength: request.headers["content-length"],
          userAgent: request.headers["user-agent"],
        },
        "공유 시트 업로드 중 오류 — 일부만 저장됐을 수 있음",
      );
    }

    // 성공/실패와 무관하게 항상 파일 목록 화면으로 돌려보낸다 — 실패했더라도 사용자가
    // 깨진 에러 페이지에 갇히는 것보다는 앱으로 돌아가서 결과를 직접 확인하는 편이 낫다.
    return reply.redirect(303, "/");
  });
}
