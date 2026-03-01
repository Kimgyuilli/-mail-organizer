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
| IMAP으로 네이버 메일 가져오기 | backend-dev | done | Phase 1 완료 | imap.naver.com:993 |
| 네이버 메일에 동일한 AI 분류 적용 | backend-dev | done | 네이버 메일 가져오기 | classifier 재사용 |
| 통합 메일 DB 스키마 설계 | backend-dev | done | Phase 1 완료 | Gmail/네이버 공통 모델 |

## Phase 3: 통합 UI + 자동화

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 통합 인박스 API (Backend) | backend-dev | done | Phase 2 완료 | `GET /api/inbox/messages` (inbox.py) |
| 백그라운드 스케줄러 (주기적 동기화 + 자동 분류) | backend-dev | done | Phase 2 완료 | APScheduler + background_sync 서비스 |
| 통합 인박스 UI (Gmail + 네이버 타임라인 뷰) | frontend-dev | done | 통합 inbox API | 소스 필터 탭 + 네이버 연결 UI + 소스 뱃지 |
| 라벨/카테고리 사이드바 + 드래그&드롭 | frontend-dev | done | 통합 인박스 UI | 카테고리 필터 + HTML5 DnD |
| 사용자 피드백 기반 분류 개선 (Frontend) | frontend-dev | done | 통합 UI | 피드백 통계 UI 완료 |
| 사용자 피드백 기반 분류 개선 (Backend) | backend-dev | done | Frontend UI | few-shot + 발신자 규칙 + 피드백 통계 API |

## Phase 4: 코드 모듈화/리팩토링

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 4-0: 환경 셋업 (테스트 인프라 + 스킬/에이전트 확장) | backend-dev + frontend-dev | done | - | pytest, vitest, /analyze 스킬, 에이전트 리팩토링 원칙 |
| 4-1: 공통 쿼리 헬퍼 추출 | backend-dev | done | 4-0 | services/helpers.py (get_mail_classifications, filter_new_external_ids) |
| 4-2: 사용자 검증 Depends 통일 | backend-dev | done | 4-0 | dependencies.py (get_current_user, get_google_user, get_naver_user) |
| 4-3: 커스텀 예외 + 에러 핸들러 | backend-dev | done | 4-0 | exceptions.py (6개 커스텀 예외 클래스) |
| 4-4: background_sync 중복 제거 | backend-dev | done | 4-1, 4-2 | Gmail/Naver 동기화 70% 중복 → 공통 로직 추출 |
| 4-5: 라우터 경량화 (gmail, naver) | backend-dev | done | 4-1, 4-2, 4-3 | 비즈니스 로직을 services로 이동 |
| 4-6: Backend 회귀 테스트 | backend-dev | done | 4-5 | 리팩토링 후 전체 API 동작 검증 |
| 4-7: Frontend 타입/상수 분리 | frontend-dev | done | 4-0 | types/mail.ts, constants/categories.ts, components/, utils/date.ts |
| 4-8: Frontend 커스텀 훅 추출 | frontend-dev | done | 4-7 | useState/useEffect를 커스텀 훅으로 분리 |
| 4-9: Frontend 컴포넌트 분리 | frontend-dev | done | 4-7, 4-8 | 인라인 컴포넌트를 components/로 분리 |
| 4-10: page.tsx 리팩토링 (150줄 목표) | frontend-dev | done | 4-8, 4-9 | 219줄 → 190줄, MailListView 추출 |
| 4-11: Frontend 회귀 테스트 | frontend-dev | done | 4-10 | 리팩토링 후 UI 동작 검증 |

## Phase 5: UI 디자인 리뉴얼 (shadcn/ui)

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 5-0: shadcn/ui 초기 셋업 | frontend-dev | done | - | dependencies, CSS vars, Toaster, ui components |
| 5-1: 3-Panel 레이아웃 | frontend-dev | done | 5-0 | ResizablePanelGroup, Sheet 모바일 사이드바 |
| 5-2: 공통 UI 컴포넌트 교체 | frontend-dev | done | 5-1 | Button, Badge, Input, Dialog, DropdownMenu, Skeleton |
| 5-3: 토스트 알림 시스템 | frontend-dev | done | 5-1 | alert() → sonner toast() 전환 |
| 5-4: AppHeader 리디자인 | frontend-dev | done | 5-2 | DropdownMenu 유저 메뉴, 세그먼트 필터 |
| 5-5: MailListItem 리디자인 | frontend-dev | done | 5-2 | DropdownMenu 카테고리 수정, hover 하이라이트 |
| 5-6: MailDetailView 리디자인 | frontend-dev | done | 5-2 | 인라인 패널, DropdownMenu 분류 변경 |
| 5-7: CategorySidebar 리디자인 | frontend-dev | done | 5-2 | lucide icons, Badge counts, Separator |
| 5-8: 반응형 + 다크모드 | frontend-dev | done | 5-1~5-7 | Sheet 모바일 사이드바, CSS 변수 통합 |
| 5-9: 테스트 업데이트 | frontend-dev | done | 5-8 | 35 tests pass, lint pass, build pass |
