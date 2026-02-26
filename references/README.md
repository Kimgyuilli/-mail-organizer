# References

프로젝트에서 조사한 기술 자료, 의사결정 기록, API 문서 요약 등을 저장하는 디렉토리.

## 파일 형식

모든 레퍼런스는 아래 frontmatter로 시작한다:

```yaml
---
title: 제목
tags: [태그1, 태그2]
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: draft | reviewed | outdated
---
```

## 네이밍 규칙

`{카테고리}-{주제}.md` 형식:

- `api-*` — 외부 API 문서 요약 (예: `api-gmail.md`)
- `decision-*` — 기술 의사결정 기록 (예: `decision-mcp-vs-api.md`)
- `guide-*` — 구현 가이드/하우투 (예: `guide-oauth-setup.md`)
- `research-*` — 기술 조사 결과 (예: `research-naver-imap.md`)

## 검색

`/ref` 스킬로 검색:
- `/ref gmail oauth` — 키워드로 검색
- `/ref --tag api` — 태그로 필터
- `/ref --list` — 전체 목록

`/save-ref` 스킬로 새 레퍼런스 저장:
- `/save-ref api-gmail Gmail API 조사 결과`
