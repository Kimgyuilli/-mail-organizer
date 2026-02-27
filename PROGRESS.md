# 진행 기록

## 2026-02-28 — backend-dev + frontend-dev (카테고리 사이드바 + 드래그&드롭)
### 완료한 작업
- **라벨/카테고리 사이드바 + 드래그&드롭** 완료
- **Backend**: `backend/app/routers/inbox.py`
  - `GET /api/inbox/messages`에 `category` 쿼리 파라미터 추가 (카테고리명 / "unclassified" / null)
  - `GET /api/inbox/category-counts` 엔드포인트 추가 (카테고리별 카운트 + 미분류 수)
- **Frontend**: `frontend/src/app/page.tsx`
  - 레이아웃: flex row (sidebar w-56 + mail list flex-1)
  - 카테고리 사이드바: 전체/카테고리별/미분류 필터, 카운트 표시, 색상 동그라미
  - HTML5 Drag and Drop: 메일 드래그 → 카테고리 드롭으로 분류 변경
  - 미분류 메일 드롭 시 AI 분류 후 사용자 선택 카테고리로 override
- **리뷰 수정**: SQL 조인 순서 수정 (select_from(Mail)), React state로 DnD 오버 관리, 에러 시 UI 동기화
- 검증: ruff check 통과, pnpm lint 통과, pnpm build 성공
### 다음 할 일
- Phase 3 마지막: 사용자 피드백 기반 분류 개선
### 이슈/참고
- 드래그&드롭은 HTML5 API만 사용 (외부 라이브러리 없음)
- sourceFilter + categoryFilter 조합 가능

## 2026-02-28 — frontend-dev (카테고리 사이드바 + 드래그&드롭)
### 완료한 작업
- **라벨/카테고리 사이드바 + 드래그&드롭** 완료
  - `frontend/src/app/page.tsx` — 사이드바 + HTML5 Drag and Drop 구현
    - 새 state: `categoryFilter` (null/"unclassified"/카테고리명), `categoryCounts` (카테고리별 카운트)
    - 새 인터페이스: `CategoryCount`, `CategoryCountsResponse`
    - `CATEGORY_DOT_COLORS` 추가 (사이드바 색상 동그라미)
    - `loadCategoryCounts()` — `GET /api/inbox/category-counts` 호출 (sourceFilter 반영)
    - `handleCategoryFilter()` — 카테고리 선택 시 offset 리셋
    - `handleDrop()` — 드래그&드롭으로 메일 분류/수정
    - 레이아웃 변경: `max-w-5xl` → `max-w-6xl`, flex row (사이드바 + 메일 목록)
    - 사이드바 UI:
      - 전체 (total), 각 카테고리 (드롭 타겟, 색상 동그라미), 미분류 (unclassified)
      - 선택된 카테고리: `bg-zinc-100 dark:bg-zinc-800`
      - 드래그 오버: `ring-2 ring-blue-400`
    - 메일 아이템: `draggable`, `onDragStart` (mailId + classificationId 전달)
    - `cursor-grab active:cursor-grabbing` 스타일 추가
    - `loadMessages` — categoryFilter 쿼리 파라미터 반영
    - 동기화/분류/수정 후 `loadCategoryCounts()` 자동 호출 추가
  - 기존 백엔드 API 활용:
    - `GET /api/inbox/category-counts` — 이미 구현됨 (inbox.py)
    - `GET /api/inbox/messages?category=...` — 이미 지원됨
- 디자인: Tailwind CSS, 다크 모드 완벽 지원, 기존 UI 패턴 100% 유지
- TypeScript strict mode 준수
### 다음 할 일
- 검증: `cd frontend && npx pnpm lint && npx pnpm build` 실행 (사용자 확인 필요)
- Phase 3 마지막 태스크: 사용자 피드백 기반 분류 개선 (backend-dev)
### 이슈/참고
- HTML5 Drag and Drop API만 사용, 외부 라이브러리 불필요
- 드롭 타겟: 카테고리 버튼만 (전체/미분류는 드롭 불가)
- 미분류 메일 드롭 시: 먼저 분류 API 호출 후 메일 목록 새로고침 (카테고리 변경은 수동)
- 카운트는 sourceFilter와 연동하여 Gmail/네이버 필터에도 대응
- 반응형: 모바일 대응은 추후 개선 가능 (현재는 데스크톱 우선)

## 2026-02-28 — backend-dev (inbox API 카테고리 필터 + 카운트 엔드포인트)
### 완료한 작업
- **inbox API에 카테고리 필터링 기능 추가**
  - `backend/app/routers/inbox.py` — `GET /api/inbox/messages` 수정
    - `category` 쿼리 파라미터 추가 (str | None)
    - `category="unclassified"` → LEFT JOIN으로 미분류 메일만 필터
    - `category="카테고리명"` → Classification + Label JOIN으로 특정 카테고리만 필터
    - `category=None` → 기존 동작 유지 (전체)
    - 기존 `source` 필터와 조합 가능
- **카테고리별 카운트 엔드포인트 추가**
  - `backend/app/routers/inbox.py` — `GET /api/inbox/category-counts` 신규
    - 쿼리 파라미터: `user_id` (필수), `source` (선택)
    - 응답 스키마:
      ```json
      {
        "total": 150,
        "unclassified": 30,
        "categories": [
          {"name": "업무", "count": 45, "color": "blue"},
          {"name": "개인", "count": 20, "color": "green"}
        ]
      }
      ```
    - 구현: 최신 Classification 기준 (subquery로 mail당 latest classification 선택)
    - Label.color 포함하여 UI에서 즉시 사용 가능
- 타입 힌트, snake_case 컨벤션 준수
### 다음 할 일
- 사용자가 `cd backend && uv run ruff check .` 실행하여 린트 검증
- 프론트엔드에서 카테고리 사이드바 구현 시 이 API 활용
- Phase 3 나머지: 라벨/카테고리 사이드바 + 드래그&드롭 UI
### 이슈/참고
- category 필터는 최신 Classification 기준 (메일당 여러 분류가 있을 수 있으므로)
- unclassified는 LEFT JOIN + WHERE NULL로 구현
- source 필터와 category 필터는 독립적으로 조합 가능 (예: Gmail + 업무)

## 2026-02-27 — backend-dev + frontend-dev (Phase 3: 통합 인박스 + 백그라운드 스케줄러)
### 완료한 작업
- **통합 인박스 API** + **통합 인박스 UI** + **백그라운드 스케줄러** — 병렬 구현 완료
- **백그라운드 스케줄러 (주기적 동기화 + 자동 분류)**
  - `backend/pyproject.toml` — `apscheduler>=3.10` 의존성 추가
  - `backend/app/config.py` — `sync_interval_minutes=15`, `auto_classify=True` 설정
  - `backend/app/services/background_sync.py` (신규) — 전체 사용자 순회 동기화
    - `sync_user_gmail()` — Gmail 증분 동기화 (page_token), 토큰 갱신 시 DB 저장
    - `sync_user_naver()` — 네이버 IMAP 증분 동기화 (UID)
    - `classify_user_mails()` — 미분류 메일 배치 분류 (50개씩)
    - `sync_all_users()` — 메인 스케줄러 함수 (사용자별 독립 세션)
  - `backend/app/main.py` — APScheduler 등록 (lifespan)
- **코드 리뷰 반영**
  - Critical: 사용자별 독립 DB 세션 분리 (rollback 격리)
  - Critical: OAuth 토큰 갱신 후 DB 저장 추가
  - Critical: `classified_count` 미정의 버그 수정
  - Fix: `or_` 미사용 import 제거 (inbox.py)
- 검증: ruff check 통과, pnpm lint 통과, pnpm build 성공
### 다음 할 일
- Phase 3 나머지: 라벨/카테고리 사이드바 + 드래그&드롭, 사용자 피드백 기반 분류 개선
### 이슈/참고
- 네이버 앱 비밀번호 평문 저장은 기존 이슈 → 별도 보안 태스크로 분리 권장
- 스케줄러 기본 간격 15분, auto_classify 기본 활성화

## 2026-02-27 — frontend-dev (통합 인박스 UI 구현)
### 완료한 작업
- **통합 인박스 UI (Gmail + 네이버 타임라인 뷰)** 완료
  - `backend/app/routers/inbox.py` — 신규: 통합 인박스 API 엔드포인트
    - `GET /api/inbox/messages` — source 파라미터로 필터링 (gmail/naver/all)
    - Gmail + 네이버 메일을 received_at 기준 통합 정렬, classification 포함
  - `backend/app/main.py` — inbox 라우터 import 및 등록
  - `frontend/src/app/page.tsx` — 전체 업그레이드 (800+ 라인)
    - 소스 필터 탭: **전체 / Gmail / 네이버** (헤더에 추가)
    - 각 메일에 소스 뱃지 표시 (Gmail: 파란색 "G", 네이버: 초록색 "N")
    - 네이버 계정 연결 UI: 모달 (이메일 + 앱 비밀번호 입력, POST /api/naver/connect)
    - 통합 동기화: Gmail + 네이버 병렬 호출 (Promise.all)
    - AI 분류: 현재 탭(source)에 맞춰 파라미터 전달
    - 메일 상세: 소스 뱃지 + 네이버 폴더 정보 표시
    - Gmail 라벨 적용 버튼: Gmail 탭에서만 표시 (네이버는 라벨 없음)
    - SourceBadge 컴포넌트 추가 (원형 뱃지, 호버 툴팁)
  - `frontend/IMPLEMENTATION_SUMMARY.md` — 구현 상세 문서화
- 인터페이스 확장: MailMessage, MailDetail에 source, to_email, folder 필드 추가
- 기존 UI 패턴 100% 유지, Tailwind CSS 컨벤션 준수, 다크 모드 완벽 지원
### 다음 할 일
- 검증: `cd frontend && pnpm lint && pnpm build` 실행하여 빌드 성공 확인
- Phase 3 나머지 태스크:
  - 라벨/카테고리 사이드바 + 드래그&드롭
  - 사용자 피드백 기반 분류 개선
### 이슈/참고
- bash 권한 제한으로 lint/build 검증 미실행 (사용자가 직접 실행 필요)
- 백그라운드 스케줄러는 backend-dev가 병렬 완료
- Gmail 라벨 적용은 Gmail 전용 기능이므로 Gmail 탭에서만 버튼 노출
- loadMessages는 sourceFilter를 의존성으로 가지므로 필터 변경 시 자동 재로드

## 2026-02-27 — backend-dev (백그라운드 스케줄러 + 통합 인박스 API)
### 완료한 작업
- **백그라운드 스케줄러** 완료
  - `backend/pyproject.toml` — `apscheduler>=3.10` 의존성 추가
  - `backend/app/config.py` — `sync_interval_minutes`, `auto_classify` 설정 추가
  - `backend/app/services/background_sync.py` — 신규: 백그라운드 동기화 서비스
    - `sync_user_gmail(user, db)` — Gmail 동기화 (build_credentials + gmail_service 사용)
    - `sync_user_naver(user, db)` — 네이버 동기화 (naver_service + SyncState 사용)
    - `classify_user_mails(user, db)` — 미분류 메일 배치 분류 (classifier.classify_batch 사용)
    - `sync_all_users()` — 메인 스케줄러 함수 (모든 사용자 순회, 에러 발생 시 스킵+로깅)
  - `backend/app/main.py` — lifespan에 APScheduler 추가
    - 스케줄러 시작: `settings.sync_interval_minutes`마다 `sync_all_users` 실행
    - 스케줄러 종료: lifespan 종료 시 cleanup
- **통합 인박스 API** 완료 (기존 파일 확인)
  - `backend/app/routers/inbox.py` — 이미 구현됨 (frontend-dev가 작업한 것으로 추정)
    - `GET /api/inbox/messages` — Gmail + 네이버 통합 타임라인
    - 쿼리 파라미터: `user_id`, `source` (필터), `offset`, `limit`
    - 응답: `messages` (classification 포함), `total`, `offset`, `limit`
  - `backend/app/main.py` — inbox 라우터 이미 등록됨
- 검증: 코드 리뷰 통과 (import, 타입 힌트 확인)
### 다음 할 일
- 의존성 설치 후 서버 시작하여 스케줄러 동작 확인 필요
  ```bash
  cd backend && uv sync && uv run fastapi dev app/main.py
  ```
- 사용자가 직접 `uv run ruff check .` 실행하여 린트 통과 확인
- Phase 3 나머지 태스크: 통합 인박스 UI (frontend-dev), 라벨/카테고리 사이드바
### 이슈/참고
- APScheduler는 FastAPI lifespan에서 시작/종료하여 서버 라이프사이클과 동기화
- 각 사용자별 동기화 시 예외 발생해도 다른 사용자는 계속 처리 (에러 로깅)
- `auto_classify=True`일 때만 자동 분류 실행
- Gmail/네이버 동기화 모두 SyncState를 활용하여 증분 동기화 지원
- inbox API는 이미 구현되어 있어서 스케줄러 작업만 수행함

## 2026-02-27 — backend-dev (네이버 메일에 동일한 AI 분류 적용)
### 완료한 작업
- **네이버 메일에 동일한 AI 분류 적용** 완료 — **Phase 2 전체 완료!**
  - `backend/app/routers/classify.py` — `POST /api/classify/mails`에 `source` 쿼리 파라미터 추가
    - `source=naver` → 네이버 메일만 분류
    - `source=gmail` → Gmail 메일만 분류
    - `source` 미지정 → 전체 메일 분류
  - 기존 classifier.py (Claude API 기반)는 소스 무관하게 동작하므로 수정 불필요
  - 네이버 메일 목록/상세 API에 이미 classification 데이터 포함 (naver.py)
- 검증: ruff check 통과
### 다음 할 일
- Phase 3 시작: 통합 인박스 UI, 백그라운드 스케줄러
### 이슈/참고
- 기존 분류 시스템이 이미 소스 무관 설계 → 최소 변경으로 완료
- Phase 2 전체 3개 태스크 완료 (통합 스키마 + IMAP + AI 분류)

## 2026-02-27 — backend-dev (IMAP으로 네이버 메일 가져오기)
### 완료한 작업
- **IMAP으로 네이버 메일 가져오기** 완료
  - `backend/app/services/naver_service.py` — 신규: IMAP 접속, 메일 가져오기, MIME 파싱
    - `_imap_connection` context manager로 연결 누수 방지
    - `verify_credentials` — IMAP 로그인 테스트
    - `list_folders` — 폴더 목록 조회
    - `fetch_messages` — UID 기반 증분 동기화, MIME 파싱, 읽음 상태 추출
    - `_parse_email`, `_decode_header_value` — 한글 인코딩 처리
  - `backend/app/routers/naver.py` — 신규: 5개 엔드포인트
    - `POST /api/naver/connect` — 네이버 계정 연결 (이메일 + 앱 비밀번호)
    - `GET /api/naver/folders` — IMAP 폴더 목록
    - `POST /api/naver/sync` — 메일 동기화 (SyncState 활용, 증분)
    - `GET /api/naver/messages` — DB에서 네이버 메일 목록 조회
    - `GET /api/naver/messages/{mail_id}` — 단건 상세
  - `backend/app/config.py` — naver_imap_host, naver_imap_port 설정 추가
  - `backend/app/main.py` — naver 라우터 등록
- 검증: ruff check 통과, 5개 엔드포인트 등록 확인
### 다음 할 일
- 네이버 메일에 동일한 AI 분류 적용 (IMAP 완료로 진행 가능)
### 이슈/참고
- IMAP은 동기 라이브러리 → asyncio.to_thread로 비동기 래핑 (Gmail 패턴과 동일)
- IMAP 연결은 context manager로 관리하여 예외 시에도 logout 보장
- SyncState의 last_uid로 증분 동기화 지원
- 네이버 앱 비밀번호는 현재 평문 저장 (Google OAuth 토큰과 동일 — 전체 암호화는 별도 태스크)

## 2026-02-27 — backend-dev (통합 메일 DB 스키마 설계)
### 완료한 작업
- **통합 메일 DB 스키마 설계** 완료 — Phase 2 첫 태스크
  - `backend/app/models/mail.py` — `to_email`, `folder` 필드 추가, `ix_mail_user_source` 복합 인덱스 추가
  - `backend/app/models/label.py` — `source` 필드 추가 (null=공통 AI 라벨, "gmail"/"naver"=소스별 라벨)
  - `backend/app/models/sync_state.py` — 새 모델: 소스별 동기화 상태 추적 (last_uid, next_page_token)
  - `backend/app/models/__init__.py` — SyncState re-export 추가
- 검증: ruff check 통과, 모델 로드 + 컬럼/인덱스 확인
### 다음 할 일
- IMAP으로 네이버 메일 가져오기 (통합 스키마 완료로 진행 가능)
- 네이버 메일에 동일한 AI 분류 적용 (IMAP 완료 후)
### 이슈/참고
- 기존 Gmail 데이터와 100% 호환 (새 필드 모두 nullable)
- 개발 DB(SQLite)는 lifespan에서 자동 생성이므로 기존 DB 파일 삭제 후 재시작 필요
- `SyncState`는 IMAP/Gmail 증분 동기화에 활용 예정
- AI 분류 라벨(source=null)은 Gmail/네이버 공통, 소스별 라벨은 source 필드로 구분

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
