# 작업 계획

## Phase 1: Gmail 연동 + AI 분류 (MVP)

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 프로젝트 초기 셋업 (backend/frontend 보일러플레이트, .gitignore) | - | pending | - | uv + FastAPI, pnpm + Next.js |
| Google Cloud OAuth 2.0 인증 플로우 구현 | - | pending | 초기 셋업 | 토큰 발급/갱신 포함 |
| Gmail API로 메일 목록/본문 가져오기 | - | pending | OAuth 인증 | gmail.readonly 스코프 |
| Claude API로 메일 내용 기반 카테고리 분류 | - | pending | 메일 가져오기 | classifier 서비스 |
| 분류 결과를 Gmail 라벨로 자동 적용 | - | pending | 카테고리 분류 | gmail.modify 스코프 |
| 기본 UI: 메일 목록 + 분류 결과 확인/수정 | - | pending | 메일 가져오기, 카테고리 분류 | Next.js 프론트 |

## Phase 2: 네이버 메일 연동

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| IMAP으로 네이버 메일 가져오기 | - | pending | Phase 1 완료 | imap.naver.com:993 |
| 네이버 메일에 동일한 AI 분류 적용 | - | pending | 네이버 메일 가져오기 | classifier 재사용 |
| 통합 메일 DB 스키마 설계 | - | pending | Phase 1 완료 | Gmail/네이버 공통 모델 |

## Phase 3: 통합 UI + 자동화

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 통합 인박스 (Gmail + 네이버 타임라인 뷰) | - | pending | Phase 2 완료 | |
| 라벨/카테고리 사이드바 + 드래그&드롭 | - | pending | 통합 인박스 | |
| 백그라운드 스케줄러 (주기적 동기화 + 자동 분류) | - | pending | Phase 2 완료 | |
| 사용자 피드백 기반 분류 개선 | - | pending | 통합 UI | |
