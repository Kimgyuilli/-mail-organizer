# 진행 기록

## 2026-02-27 — frontend-dev + backend-dev (분류 결과 확인/수정 UI)
### 완료한 작업
- **프론트: 분류 결과 확인/수정 UI** 완료 — **Phase 1 전체 완료!**
  - `frontend/src/app/page.tsx` — 분류 UI 통합
    - 메일 목록: 카테고리 컬러 뱃지 표시 (7개 카테고리별 색상)
    - 인라인 수정: 뱃지 클릭 → 드롭다운으로 카테고리 변경
    - 상세 보기: 분류 결과 + confidence 표시, 드롭다운 수정
    - 수동 수정된 항목은 * 표시
    - 헤더 버튼: "AI 분류" (배치 분류), "Gmail 라벨 적용"
    - 분류 현황 카운터: "분류됨: N/M"
  - `backend/app/routers/gmail.py` — messages 엔드포인트에 classification 데이터 포함
  - `backend/app/routers/classify.py` — 2개 엔드포인트 추가
    - `PUT /api/classify/update` — 수동 분류 수정 (user_feedback 기록)
    - `GET /api/classify/categories` — 사용 가능한 카테고리 목록
- 검증: ruff check 통과, pnpm lint 통과, pnpm build 성공
### 다음 할 일
- Phase 2 시작: IMAP으로 네이버 메일 가져오기, 통합 메일 DB 스키마 설계
### 이슈/참고
- Phase 1 전체 10개 태스크 완료 (MVP 기능 완성)
- 분류 수정 시 user_feedback 컬럼에 기록하여 향후 학습 데이터로 활용 가능
- CategoryBadge 컴포넌트로 분리하여 재사용성 확보

## 2026-02-27 — backend-dev + frontend-dev (라벨 적용 + 메일 목록 병렬)
### 완료한 작업
- **분류 결과를 Gmail 라벨로 적용** 완료
  - `backend/app/services/gmail_service.py` — list_labels, create_label, apply_labels, batch_apply_labels, get_or_create_gmail_label 추가
  - `backend/app/routers/gmail.py` — `POST /api/gmail/apply-labels` 엔드포인트
  - AI 분류 결과를 "AI/카테고리명" 형식으로 Gmail 라벨 생성/적용
- **프론트: 메일 목록 페이지** 완료
  - `frontend/src/app/page.tsx` — 전체 재작성
  - 로그인 화면: Google OAuth 로그인 버튼
  - 메일 목록: 발신자, 제목, 날짜, 읽음 상태 표시
  - 메일 상세: 본문 보기
  - 메일 동기화 버튼
  - 페이지네이션 (이전/다음)
  - `frontend/src/app/layout.tsx` — 메타데이터 업데이트
- **OAuth 콜백 리다이렉트** 개선
  - `backend/app/routers/auth.py` — 콜백 후 프론트엔드로 RedirectResponse (user_id 전달)
- 검증: ruff check 통과, pnpm lint 통과, pnpm build 성공, 엔드포인트 등록 확인
### 다음 할 일
- 프론트: 분류 결과 확인/수정 UI (Phase 1 마지막 태스크)
### 이슈/참고
- Gmail 라벨은 "AI/" 프리픽스로 사용자 기존 라벨과 충돌 방지
- OAuth 콜백: JSON 반환 → RedirectResponse로 변경하여 브라우저 플로우 지원
- 프론트에서 user_id는 localStorage에 저장 (간단한 세션 관리)

## 2026-02-27 — backend-dev (Gmail 메일 가져오기 서비스 + 라우터)
### 완료한 작업
- **Gmail API 메일 가져오기 서비스** 완료
  - `backend/app/services/gmail_service.py` — Gmail API 클라이언트 빌드, 메일 목록/상세 조회
  - MIME multipart 파싱, base64url 디코딩, HTML→텍스트 변환
  - asyncio.to_thread로 동기 Google API를 비동기 래핑
  - 함수: list_message_ids(), get_message_detail(), get_messages_batch()
- **Gmail API 메일 가져오기 라우터** 완료
  - `backend/app/routers/gmail.py` — 4개 엔드포인트
  - `POST /api/gmail/sync` — 단일 페이지 동기화 (중복 필터링)
  - `POST /api/gmail/sync/full` — 다중 페이지 동기화 (max_pages, per_page)
  - `GET /api/gmail/messages` — DB에서 메일 목록 조회 (페이지네이션)
  - `GET /api/gmail/messages/{mail_id}` — 단건 메일 상세 (본문 포함)
  - `backend/app/main.py` — gmail 라우터 등록
- 검증: ruff check 통과, 모든 import 확인, 4개 엔드포인트 등록 확인
### 다음 할 일
- 분류 결과를 Gmail 라벨로 적용 (분류 서비스 + 메일 가져오기 완료로 진행 가능)
- 프론트: 메일 목록 페이지 (메일 가져오기 라우터 완료로 진행 가능)
- 프론트: 분류 결과 확인/수정 UI (메일 목록 + 분류 서비스 완료 후)
### 이슈/참고
- Google API 클라이언트(googleapiclient)는 동기 전용 → asyncio.to_thread로 래핑
- 메일 본문은 text/plain 우선, text/html fallback (HTML 태그 제거)
- sync 엔드포인트는 이미 DB에 있는 메일은 스킵 (external_id 기준)

## 2026-02-27 — backend-dev (OAuth + Classifier 병렬 구현)
### 완료한 작업
- **Google OAuth 2.0 인증 플로우 구현** 완료
  - `backend/app/services/google_auth.py` — OAuth URL 생성, 토큰 교환/갱신, credentials 빌드, userinfo 조회
  - `backend/app/routers/auth.py` — `GET /auth/login`, `GET /auth/callback`, `GET /auth/me`, 토큰 자동 갱신 헬퍼
  - 스코프: gmail.readonly, gmail.labels, gmail.modify, userinfo.email, openid
  - 의존성 추가: google-auth, google-auth-oauthlib, google-api-python-client
- **Claude API 메일 분류 서비스** 완료
  - `backend/app/services/classifier.py` — 단건 분류(classify_single), 배치 분류(classify_batch), 7개 기본 카테고리, 본문 500자 truncation
  - `backend/app/routers/classify.py` — `POST /api/classify/single` (stateless), `POST /api/classify/mails` (DB 저장, 기본 라벨 자동 생성)
  - 모델: claude-sonnet-4-5-20250929
- `backend/app/main.py` — auth, classify 라우터 등록
- 검증: ruff check 통과, import 확인, ASGI 테스트 (health, auth/login URL 생성, docs 페이지) 통과
### 다음 할 일
- Gmail API 메일 가져오기 서비스 (OAuth 완료로 진행 가능)
- Gmail API 메일 가져오기 라우터 (서비스 완료 후)
- 분류 결과를 Gmail 라벨로 적용 (메일 가져오기 + 분류 서비스 완료로 진행 가능)
- 프론트: 메일 목록 페이지 (메일 가져오기 라우터 완료 후)
### 이슈/참고
- OAuth는 access_type=offline, prompt=consent로 refresh_token 항상 수령
- 토큰 만료 시 get_current_user_credentials()에서 자동 갱신
- 분류 서비스는 Anthropic async client 사용 (비동기 I/O)
- 배치 분류는 한 API 호출로 여러 메일 처리 (비용 최적화)

## 2026-02-27 — backend-dev + frontend-dev (병렬)
### 완료한 작업
- **DB 모델 정의** 완료
  - `backend/app/models/base.py` — async engine, session factory, Base, get_db()
  - `backend/app/models/user.py` — User 모델 (OAuth 토큰, 네이버 인증)
  - `backend/app/models/mail.py` — Mail 모델, mail_labels 연결 테이블 (UniqueConstraint: user_id+source+external_id)
  - `backend/app/models/label.py` — Label 모델 (UniqueConstraint: user_id+name), Classification 모델 (confidence, user_feedback)
  - `backend/app/models/__init__.py` — 전체 모델 re-export
  - `backend/app/main.py` — lifespan에서 테이블 자동 생성
  - 검증: ruff check 통과, 서버 시작 + DB 테이블 생성 확인
- **Frontend 초기 셋업** 완료
  - Next.js 16.1.6 + TypeScript + Tailwind CSS + App Router
  - `frontend/src/lib/api.ts` — 백엔드 API 클라이언트 (apiFetch 함수)
  - `frontend/src/app/page.tsx` — 랜딩 페이지 (백엔드 헬스체크 상태 표시)
  - `frontend/.env.local` — API URL 설정
  - 검증: pnpm lint 통과, pnpm build 성공
### 다음 할 일
- Google OAuth 2.0 인증 플로우 구현 (Backend 셋업 + Phase 0 완료로 진행 가능)
- Gmail API 메일 가져오기 서비스 (OAuth 인증 완료 후)
- Claude API 메일 분류 서비스 (Backend 셋업 완료로 진행 가능)
### 이슈/참고
- pnpm은 시스템에 글로벌 설치 안 됨, `npx pnpm`으로 실행
- Python 3.13.3, Node 22.16.0 사용
- SQLAlchemy 모델 간 순환 참조는 TYPE_CHECKING으로 해결

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
