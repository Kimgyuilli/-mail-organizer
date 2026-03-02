# 작업 계획

> v1 (Phase 0~5) 완료 — 아카이브: [PLAN_V1.md](./PLAN_V1.md)

## Phase 6: Oracle Cloud 배포

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 환경변수 기반 설정 전환 | backend-dev | done | — | config.py, main.py, auth.py |
| Next.js standalone 빌드 설정 | frontend-dev | done | — | next.config.ts |
| Backend Dockerfile 작성 | backend-dev | done | — | Python 3.13-slim + uv |
| Frontend Dockerfile 작성 | frontend-dev | done | — | Multi-stage, standalone |
| Docker Compose + Caddy 설정 | backend-dev | done | — | 리버스 프록시 + 자동 HTTPS |
| .dockerignore + env 템플릿 | backend-dev | done | — | |
| Oracle VM 프로비저닝 + 배포 | — | blocked | 위 전체 | ARM capacity 부족, 재시도 필요 |
