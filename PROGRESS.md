# 진행 기록

> v1 (Phase 0~5) 기록 아카이브: [PROGRESS_V1.md](./PROGRESS_V1.md)

## 2026-03-02 — backend-dev (Oracle Cloud 배포 코드 작업)
### 완료한 작업
- `backend/app/config.py`: `frontend_url` 설정 추가
- `backend/app/main.py`: CORS origins를 `settings.frontend_url`에서 읽도록 변경
- `backend/app/routers/auth.py`: OAuth 콜백 리다이렉트 URL을 `settings.frontend_url` 사용
- `frontend/next.config.ts`: `output: "standalone"` 추가
- `backend/Dockerfile`: Python 3.13-slim + uv 기반
- `frontend/Dockerfile`: Multi-stage build (deps → build → production)
- `docker-compose.yml`: backend + frontend + Caddy (리버스 프록시 + 자동 HTTPS)
- `Caddyfile`: `/api/*` → backend, `/*` → frontend
- `.dockerignore` (backend, frontend 각각)
- `backend/.env.example` 업데이트 (FRONTEND_URL 추가)
- `.env.production.example` 생성 (DOMAIN 설정)
- `.gitignore`에 `.env.production` 추가
### 다음 할 일
- Oracle Cloud VM 프로비저닝 (ARM, Free Tier)
- 서버에서 `docker compose up -d`로 배포
- DNS 설정 후 HTTPS 자동 발급 확인
### 이슈/참고
- SQLite 유지 (1인 사용, 볼륨 마운트로 영속)
- 로컬 개발 플로우 변경 없음 (`uv run fastapi dev`, `pnpm dev` 그대로)
- Caddy가 `/api` prefix를 strip하므로 프론트에서 API 호출 시 `/api/...` 경로 사용

## 2026-03-02 — planner (v1 release 정리 및 v2 준비)
### 완료한 작업
- v1 아카이브: PLAN_V1.md, PROGRESS_V1.md 생성
- PLAN.md, PROGRESS.md를 v2 시작점으로 초기화
- references/ 정리 — 구현 완료된 조사 자료 5개 삭제, 2개 유지
- CLAUDE.md 업데이트 — 로드맵 완료 표시, 프로젝트 구조 현행화
### 다음 할 일
- v2 기획 및 태스크 정의
### 이슈/참고
- v1 전체 40개 태스크 (Phase 0~5) 완료
- 스킬/에이전트는 모두 범용적이므로 전부 유지
