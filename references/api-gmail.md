---
title: Gmail API 연동 가이드
tags: [gmail, api, oauth, google]
created: 2026-02-26
updated: 2026-02-26
status: draft
---

# Gmail API 연동 가이드

## 사전 준비

1. Google Cloud Console에서 프로젝트 생성
2. Gmail API 활성화
3. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션 유형)
4. 리다이렉트 URI 설정 (예: `http://localhost:8000/auth/callback`)

## 필요한 OAuth 스코프

| 스코프 | 용도 |
|--------|------|
| `gmail.readonly` | 메일 목록/본문 읽기 |
| `gmail.labels` | 라벨 생성/수정/삭제 |
| `gmail.modify` | 메일에 라벨 적용, 읽음 처리 등 |

## Python 라이브러리

```
google-auth
google-auth-oauthlib
google-api-python-client
```

## 핵심 API 엔드포인트

### 메일 목록 가져오기
```
GET /gmail/v1/users/me/messages
```
- 쿼리 파라미터: `q` (검색 문법), `maxResults`, `pageToken`
- 반환: message ID 목록 → 개별 조회 필요

### 메일 상세 조회
```
GET /gmail/v1/users/me/messages/{id}
```
- `format=full`: 전체 본문 (MIME)
- `format=metadata`: 헤더만 (제목, 발신자 등)

### 라벨 관리
```
GET    /gmail/v1/users/me/labels           # 목록
POST   /gmail/v1/users/me/labels           # 생성
POST   /gmail/v1/users/me/messages/{id}/modify  # 메일에 라벨 적용
POST   /gmail/v1/users/me/messages/batchModify  # 배치 라벨 적용
```

## 주의사항

- 메일 본문은 base64url 인코딩 → 디코딩 필요
- multipart MIME → HTML 파트 추출 필요 (text/html 또는 text/plain)
- Rate limit: 초당 250 요청 (사용자당), 일일 10억 쿼리 유닛
- OAuth 토큰 갱신: refresh_token으로 자동 갱신 구현 필요
- 테스트 단계에서는 "외부" 배포 상태 → 100명 제한, 7일마다 재동의

## TODO

- [ ] 실제 OAuth 플로우 구현 후 세부 사항 업데이트
- [ ] Rate limit 처리 전략 문서화
- [ ] 메일 파싱 유틸리티 구현 가이드 추가
