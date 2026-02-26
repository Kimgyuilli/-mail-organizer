---
title: "Gmail 연동: MCP vs 직접 API 비교"
tags: [gmail, mcp, api, architecture]
created: 2026-02-26
updated: 2026-02-26
status: reviewed
---

# Gmail 연동: MCP vs 직접 API 비교

## 배경

Gmail 메일을 가져와서 AI 분류하는 기능 구현 시, Gmail MCP 서버를 쓸지 직접 Gmail API를 쓸지 비교.

## MCP 서버 현황

커뮤니티 Gmail MCP 서버 다수 존재:
- **GongRzhe/Gmail-MCP-Server** — 17개 도구 (읽기, 보내기, 라벨, 필터, 배치 등)
- **PaulFidika/gmail-mcp-server** — 쓰레드 검색, 작성 스타일 학습
- **Zapier Gmail MCP** — Zapier 통합 기반

### GongRzhe/Gmail-MCP-Server 주요 도구
| 도구 | 기능 |
|------|------|
| search_emails | Gmail 검색 문법으로 메일 검색 |
| read_email | 메일 본문 + 첨부파일 메타데이터 조회 |
| modify_email | 개별 메일 라벨 변경 |
| batch_modify_emails | 배치 라벨 변경 |
| create_label / delete_label | 라벨 CRUD |
| create_filter / list_filters | 필터 규칙 관리 |

인증: OAuth2, `~/.gmail-mcp/`에 크리덴셜 저장

## 비교 결과

| 항목 | MCP | 직접 API |
|------|-----|----------|
| 초기 셋업 | 빠름 (설치만) | OAuth 직접 구현 필요 |
| 커스터마이징 | 제한적 | 완전한 통제 |
| 자동화 (크론잡) | 불가 (대화 기반) | 가능 |
| 네이버 통합 | MCP 없음 → 별도 구현 | 같은 아키텍처로 통합 |
| 독립 UI | 불가 | 가능 |
| 데이터 저장/분석 | 불가 | DB에 축적 가능 |
| 보안/신뢰도 | 커뮤니티 의존 | 직접 통제 |

## 결론

**직접 API 구현** 채택.

이유:
1. 최종 목표가 Gmail + 네이버 통합 UI → MCP로는 달성 불가
2. 백그라운드 자동 분류 필요 → MCP는 대화 시에만 동작
3. 분류 히스토리 DB 축적 필요 → MCP는 상태 저장 안 됨

MCP는 초기 프로토타이핑/분류 로직 실험용으로만 고려.

## 참고 링크

- https://github.com/GongRzhe/Gmail-MCP-Server
- https://mcpservers.org/servers/PaulFidika/gmail-mcp-server
- https://zapier.com/mcp/gmail
