---
title: 네이버 메일 IMAP 연동 조사
tags: [naver, imap, email]
created: 2026-02-26
updated: 2026-02-26
status: draft
---

# 네이버 메일 IMAP 연동 조사

## 접속 정보

| 항목 | 값 |
|------|-----|
| IMAP 서버 | `imap.naver.com` |
| 포트 | 993 (SSL) |
| SMTP 서버 | `smtp.naver.com` |
| SMTP 포트 | 587 (STARTTLS) |

## 인증 방법

1. **앱 비밀번호** — 네이버 계정 2단계 인증 활성화 후 앱 비밀번호 생성
2. **네이버 개발자센터 OAuth** — 네이버 로그인 API (제한적, 메일 스코프 확인 필요)

## Python IMAP 라이브러리

- `imaplib` (표준 라이브러리)
- `imapclient` (더 편리한 API)
- `mailparser` (메일 파싱)

## 네이버 IMAP 특이사항

- 네이버 메일 설정에서 POP3/IMAP 수동 활성화 필요
- 폴더 이름이 한글일 수 있음 (IMAP UTF-7 인코딩)
- 네이버 자체 분류 폴더: 받은메일함, 보낸메일함, 내게쓴메일함, 스팸메일함 등
- IMAP으로는 "라벨"이 아닌 "폴더" 기반 → Gmail과 분류 체계 차이

## Gmail과의 차이점

| 항목 | Gmail | 네이버 |
|------|-------|--------|
| 프로토콜 | REST API | IMAP |
| 분류 체계 | 라벨 (다중 태깅) | 폴더 (단일 소속) |
| 검색 | Gmail 검색 문법 | IMAP SEARCH 명령 |
| 배치 작업 | API 배치 엔드포인트 | IMAP UID 범위 지정 |
| 실시간 알림 | Push notification / History API | IMAP IDLE |

## TODO

- [ ] 실제 네이버 IMAP 접속 테스트
- [ ] 한글 폴더명 인코딩 처리 검증
- [ ] 네이버 OAuth 메일 스코프 가능 여부 확인
