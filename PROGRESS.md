# 진행 기록

## 2026-02-26 23:35 — backend-dev
### 완료한 작업
- Backend 초기 셋업 (FastAPI + uv) 완료
  - uv 설치 및 프로젝트 초기화 (`backend/pyproject.toml`)
  - 의존성 추가: fastapi[standard], sqlalchemy, aiosqlite, python-dotenv, httpx, anthropic, pydantic-settings
  - dev 의존성: ruff
  - 디렉토리 구조 생성: `app/`, `app/routers/`, `app/services/`, `app/models/` (각 `__init__.py` 포함)
  - `app/config.py` — pydantic-settings 기반 환경변수 로드 (Google OAuth, Anthropic, DB URL)
  - `app/main.py` — FastAPI 앱, CORS 미들웨어 (localhost:3000), `/health` 엔드포인트
- 검증 완료
  - `uv run ruff check .` → All checks passed
  - `uv run uvicorn app.main:app` → `GET /health` → `{"status": "ok"}` 확인
### 다음 할 일
- Frontend 초기 셋업 (Next.js + pnpm) — 병렬 가능
- DB 모델 정의 (메일, 라벨, 사용자) — Backend 셋업 완료로 진행 가능
- Google OAuth 2.0 인증 플로우 구현 — Phase 0 완료 필요
### 이슈/참고
- Python 3.13.3 사용 (uv가 자동 감지)
- `.env`와 `.env.example`은 이전에 이미 생성됨

## 2026-02-26 22:55 — 프로젝트 인프라 구축

### 완료한 작업
- CLAUDE.md 작성 (프로젝트 목표, 기술 스택, 구조, 컨벤션)
- 에이전트 워크플로우 설계 및 CLAUDE.md에 문서화
- 서브에이전트 5개 생성 (`.claude/agents/`): planner, backend-dev, frontend-dev, researcher, reviewer
- 스킬 10개 생성 (`.claude/skills/`): sync, next, done, blocked, review, test, setup-check, implement-task, ref, save-ref
- 레퍼런스 시스템 구축 (`references/`): README + 초기 자료 6건
  - `api-gmail.md` — Gmail API 가이드
  - `decision-mcp-vs-api.md` — MCP vs API 비교 (결론: 직접 API)
  - `guide-claude-code-skills.md` — Claude Code 스킬 구조
  - `guide-subagent-architecture.md` — 서브에이전트 아키텍처
  - `research-mail-classification.md` — AI 분류 전략
  - `research-naver-imap.md` — 네이버 IMAP 조사
- PLAN.md 세분화 (Phase 0 추가, Phase 1 태스크 10개로 분해)
- .gitignore 생성

### 다음 할 일
- **Phase 0 (사용자)**: Google Cloud 프로젝트 생성, OAuth 클라이언트 ID 발급, Anthropic API 키 발급
- **Phase 1 첫 태스크**: Backend 초기 셋업 + Frontend 초기 셋업 (병렬 가능)

### 이슈/참고
- Phase 0은 사용자가 직접 해야 함 (GCP 콘솔, Anthropic 콘솔)
- Backend/Frontend 초기 셋업은 Phase 0 없이도 시작 가능
- OAuth 인증 구현부터는 Phase 0 완료 필요

## 2026-02-26 — 초기 설정
### 완료한 작업
- CLAUDE.md 초안 작성
- PLAN.md, PROGRESS.md 생성

### 다음 할 일
- 에이전트/스킬 인프라 구축

### 이슈/참고
- 빈 레포 상태에서 시작
