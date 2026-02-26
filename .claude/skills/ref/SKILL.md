---
name: ref
description: references/ 디렉토리에서 레퍼런스를 검색하고 내용을 조회한다. 조사 자료, API 문서, 의사결정 기록을 찾을 때 사용.
argument-hint: "[키워드 | --tag 태그 | --list]"
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep
---

`references/` 디렉토리에서 레퍼런스를 검색한다.

인자: $ARGUMENTS

## 동작 모드

### 1. `--list` — 전체 목록
`references/` 안의 모든 `.md` 파일(README.md 제외)을 읽고, 각 파일의 frontmatter에서 title, tags, status를 추출하여 테이블로 출력한다.

```
## 레퍼런스 목록

| 파일 | 제목 | 태그 | 상태 |
|------|------|------|------|
| api-gmail.md | Gmail API 연동 가이드 | gmail, api, oauth | draft |
| ... | ... | ... | ... |
```

### 2. `--tag <태그>` — 태그 필터
frontmatter의 `tags` 배열에 해당 태그가 포함된 파일만 목록으로 출력한다.

### 3. 키워드 검색 (기본)
인자를 키워드로 취급하여:
1. `references/` 내 모든 `.md` 파일의 파일명과 frontmatter title에서 키워드 매칭
2. 파일 본문에서 Grep으로 키워드 검색
3. 매칭된 파일의 관련 섹션을 요약하여 출력

```
## 검색 결과: "키워드"

### 파일명 (제목)
- 관련 내용 요약
- 파일 경로: references/파일명.md

### 파일명2 (제목)
- ...
```

### 4. 파일명 직접 지정
인자가 `.md`로 끝나거나 `references/` 내 파일명과 정확히 일치하면, 해당 파일 전체를 읽어서 출력한다.

## 활용 안내
검색 결과가 없으면 관련 키워드를 제안하거나, `/save-ref`로 새로 조사해서 저장할 것을 안내한다.
