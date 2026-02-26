---
name: save-ref
description: 조사한 내용을 references/ 디렉토리에 정해진 형식으로 저장한다.
argument-hint: "[카테고리-주제] [제목 설명]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Write, Glob
---

새 레퍼런스를 `references/` 에 저장한다.

인자: $ARGUMENTS
- 첫 번째 단어: 파일명 (`카테고리-주제` 형식)
- 나머지: 제목/설명

## 파일명 규칙

카테고리 접두사:
- `api-*` — 외부 API 문서 요약
- `decision-*` — 기술 의사결정 기록
- `guide-*` — 구현 가이드/하우투
- `research-*` — 기술 조사 결과

파일명이 규칙에 맞지 않으면 사용자에게 적절한 카테고리를 제안한다.

## 저장 절차

1. 파일명 확인: `references/{카테고리-주제}.md`
2. 동일 파일이 이미 존재하면 사용자에게 덮어쓸지 확인
3. 아래 형식으로 파일 생성:

```yaml
---
title: "제목"
tags: [관련 태그들]
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: draft
---
```

4. 본문 작성:
   - 현재 대화에서 조사한 내용을 정리
   - 핵심 정보, 비교 표, 코드 예시 등 포함
   - TODO 섹션에 추가 조사 필요 항목 기록

5. 저장 완료 후 출력:
```
## 레퍼런스 저장 완료
- 파일: references/{파일명}.md
- 제목: {제목}
- 태그: {태그 목록}
```

## 기존 레퍼런스 업데이트

파일명이 이미 존재하고 사용자가 업데이트를 원하면:
- 기존 내용을 읽고
- 새 정보를 병합
- `updated` 날짜를 오늘로 변경
- 이전에 `draft`였으면 `reviewed`로 변경 가능 여부를 사용자에게 확인
