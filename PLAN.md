# 작업 계획

## Phase 0: 사전 준비 (사용자 수동)

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| Google Cloud 프로젝트 생성 + Gmail API 활성화 | 사용자 | done | - | console.cloud.google.com |
| OAuth 2.0 클라이언트 ID 생성 (웹 앱) | 사용자 | done | GCP 프로젝트 | redirect URI: http://localhost:8000/auth/callback |
| Anthropic API 키 발급 | 사용자 | done | - | console.anthropic.com |

## Phase 1: Gmail 연동 + AI 분류 (MVP)

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| Backend 초기 셋업 (FastAPI + uv) | backend-dev | done | - | pyproject.toml, main.py, config.py |
| Frontend 초기 셋업 (Next.js + pnpm) | frontend-dev | done | - | create-next-app, TypeScript 설정 |
| DB 모델 정의 (메일, 라벨, 사용자) | backend-dev | done | Backend 셋업 | SQLAlchemy + SQLite |
| Google OAuth 2.0 인증 플로우 구현 | backend-dev | done | Backend 셋업, Phase 0 완료 | 토큰 발급/갱신, `/auth/login`, `/auth/callback`, `/auth/me` |
| Gmail API 메일 가져오기 서비스 | backend-dev | done | OAuth 인증, DB 모델 | gmail_service.py, 페이지네이션, MIME 파싱 |
| Gmail API 메일 가져오기 라우터 | backend-dev | done | 메일 가져오기 서비스 | `/api/gmail/sync`, `/api/gmail/messages`, `/api/gmail/sync/full` |
| Claude API 메일 분류 서비스 | backend-dev | done | Backend 셋업, Phase 0 (API 키) | classifier.py, 배치 분류, `/api/classify/single`, `/api/classify/mails` |
| 분류 결과를 Gmail 라벨로 적용 | backend-dev | done | 분류 서비스, 메일 가져오기 | `POST /api/gmail/apply-labels`, AI/ prefix |
| 프론트: 메일 목록 페이지 | frontend-dev | done | Frontend 셋업, 메일 가져오기 라우터 | 로그인, 메일 목록, 상세 보기, 동기화, 페이지네이션 |
| 프론트: 분류 결과 확인/수정 UI | frontend-dev | done | 메일 목록 페이지, 분류 서비스 | 카테고리 뱃지, 드롭다운 수정, Gmail 라벨 적용 버튼 |

## Phase 2: 네이버 메일 연동

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| IMAP으로 네이버 메일 가져오기 | backend-dev | pending | Phase 1 완료 | imap.naver.com:993 |
| 네이버 메일에 동일한 AI 분류 적용 | backend-dev | pending | 네이버 메일 가져오기 | classifier 재사용 |
| 통합 메일 DB 스키마 설계 | backend-dev | pending | Phase 1 완료 | Gmail/네이버 공통 모델 |

## Phase 3: 통합 UI + 자동화

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 통합 인박스 (Gmail + 네이버 타임라인 뷰) | frontend-dev | pending | Phase 2 완료 | |
| 라벨/카테고리 사이드바 + 드래그&드롭 | frontend-dev | pending | 통합 인박스 | |
| 백그라운드 스케줄러 (주기적 동기화 + 자동 분류) | backend-dev | pending | Phase 2 완료 | |
| 사용자 피드백 기반 분류 개선 | backend-dev | pending | 통합 UI | |
