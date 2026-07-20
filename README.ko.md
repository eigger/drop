# Drop

[![CI](https://github.com/eigger/drop/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/eigger/drop/actions/workflows/ci.yml)
[![Docker Release](https://github.com/eigger/drop/actions/workflows/docker-release.yml/badge.svg)](https://github.com/eigger/drop/actions/workflows/docker-release.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/eigger/drop)](https://github.com/eigger/drop/blob/main/LICENSE)
[![Self-hosted](https://img.shields.io/badge/hosting-self--hosted-2563EB)](proxmox/ct/drop.sh)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Feigger%2Fdrop-2496ED?logo=docker&logoColor=white)](https://github.com/eigger/drop/pkgs/container/drop-api)

셀프호스팅하는 가벼운 파일 중계 서비스. 모바일 ↔ PC 간 파일을 최대한 간단하게 주고받는 게 핵심 — 안드로이드에서는 카톡/갤러리 등의 공유 시트에서 바로 업로드하고, PC에서는 드래그앤드롭으로 올리고 클릭 한 번으로 내려받는다.

[English](./README.md)

---

### 스크린샷
![Drop 모바일 스크린샷](./docs/screenshot.png)

---

## 기능

- **업로드**: 드래그앤드롭/파일 선택(다중 파일), 안드로이드 공유 시트(`share_target`)로 다른 앱에서 바로 전송
- **대용량 파일**: 8MB 단위 청크 업로드 — 요청 하나의 메모리 사용량이 파일 크기와 무관하게 일정하고, 앱이 중간에 죽어도(모바일 백그라운드 종료 등) 같은 파일을 다시 선택하면 이어서 올라간다
- **다운로드**: 개별 다운로드는 물론, 여러 파일을 체크박스로 선택해 zip으로 한 번에 다운로드
- **폴더**: 폴더 안에 폴더를 만들 수 있는 다중 계층 구조, 파일을 폴더로 이동
- **휴지통**: 삭제는 소프트 삭제 → 복원 가능, 30일 뒤 자동 영구 삭제
- **PWA**: 홈 화면에 설치, 오프라인 앱 셸 캐싱
- **인증**: 회원가입 없이 최초 1회 관리자 부트스트랩, 관리자만 이후 계정 추가 가능, 관리자/일반 권한
- **다국어**: 한국어/영어
- **가벼운 배포**: PostgreSQL + Fastify API + Next.js 웹 + Caddy, Docker Compose 한 방 또는 Proxmox LXC 원클릭 설치

---

## 빠른 시작

### 1. 설치

**Proxmox (권장)**

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/eigger/drop/main/proxmox/ct/drop.sh)"
```

Debian 13 LXC에 Docker를 설치하고, 배포 파일과 무작위 시크릿이 담긴 `.env`를 `/opt/drop`에 써넣은 뒤 `drop.service` systemd 유닛으로 스택을 실행한다. 완료되면 `http://<LXC_IP>`로 접속. 이후 컨테이너 안에서 `update`로 업데이트.

**Docker Compose**

```sh
cp .env.example .env   # POSTGRES_PASSWORD, JWT_SECRET 설정
docker compose -f docker-compose.prod.yml up -d
```

이미지는 `ghcr.io/<owner>/drop-api` / `drop-web`에서 받아온다 — 포크한 경우 `GH_REPOSITORY_OWNER`를 맞게 설정.

### 2. 첫 관리자 계정 만들기

설치 직후 `/login`을 열면 사용자가 한 명도 없을 때만 **관리자 계정 만들기** 화면이 뜬다. 이름/이메일/비밀번호를 입력하면 바로 관리자로 로그인된다. 이후 공개 회원가입은 없고, 관리자가 **더보기 → 사용자 관리**에서만 계정을 추가할 수 있다.

### 3. 안드로이드에서 공유로 업로드

PWA를 홈 화면에 설치하면 카카오톡/갤러리 등 다른 앱의 공유 시트에 drop이 바로 뜬다. iOS Safari는 Web Share Target API(받는 쪽)를 지원하지 않아서 같은 방식은 안 되고, 웹앱을 직접 열어 파일을 선택해서 올리면 된다.

---

## 프로젝트 구조

```
drop/
  apps/
    api/      # Fastify + Prisma (PostgreSQL)
    web/      # Next.js App Router (PWA, ko/en)
  packages/
    shared/   # 공유 Zod 스키마
  scripts/    # 아이콘 생성 스크립트
  docker-compose.yml / docker-compose.prod.yml
  Caddyfile
  proxmox/    # LXC 원클릭 설치
```

---

## 로컬 개발

```sh
npm install
cp .env.example .env       # POSTGRES_PASSWORD, JWT_SECRET 설정
docker compose up -d postgres
npm run prisma:migrate
npm run dev:api             # :8080
npm run dev:web             # :3000
```

`http://localhost:3000`을 열면 최초 실행 시 관리자 계정 만들기 화면이 뜬다.

유용한 스크립트: `npm run build`, `npm run test`, `npm run lint`, `npm run prisma:generate`.

---

## 프로덕션 참고

- 스택: PostgreSQL 16 + API + Web + Caddy(`:80`, 뒤에 리버스 프록시나 Cloudflare Tunnel로 HTTPS 종단)
- API는 프로덕션 컴포즈에서 시작 시 `prisma migrate deploy`를 실행한다
- 이미지: `ghcr.io/<owner>/drop-api` / `drop-web` (`latest` + semver 태그)
- LXC 업데이트: 컨테이너 안에서 `update` (컴포즈 이미지 pull)
- 업로드 허용 최대 용량은 `FILE_SIZE_LIMIT_MB`로 조절 (기본 10GB) — 청크 업로드라 이 값을 키워도 서버 메모리 사용량엔 영향 없음

---

## CI/CD

| 워크플로 | 트리거 | 목적 |
|---|---|---|
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | `main`에 push / PR | 설치, lint, 빌드, 테스트 |
| [`.github/workflows/docker-release.yml`](./.github/workflows/docker-release.yml) | GitHub Release | GHCR에 이미지 push |

---

## License

MIT. [LICENSE](./LICENSE) 참고.
