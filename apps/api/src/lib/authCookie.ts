import type { FastifyReply } from "fastify";

// 공유 시트(share_target)로 들어오는 업로드는 OS가 직접 폼 POST를 보내기 때문에 JS로
// Authorization 헤더를 붙일 수 없다. 그래서 로그인/부트스트랩 시 같은 JWT를 httpOnly 쿠키에도
// 실어 보내고, /api/share-target은 이 쿠키만으로 인증한다. 배포는 항상 리버스 프록시나
// Cloudflare Tunnel 뒤에서 https로 노출되므로 Secure 플래그를 켜도 안전하다.
export const SESSION_COOKIE_NAME = "drop_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // JWT 만료(90일)와 동일

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}
