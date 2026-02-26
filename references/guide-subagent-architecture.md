---
title: 서브에이전트 아키텍처 가이드
tags: [claude-code, agents, architecture, dev-tooling]
created: 2026-02-26
updated: 2026-02-26
status: reviewed
---

# 서브에이전트 아키텍처 가이드

## 에이전트 정의

`.claude/agents/<name>.md` 파일로 정의. YAML frontmatter + 본문 지시문.

### frontmatter 주요 필드

| 필드 | 설명 |
|------|------|
| `name` | 고유 ID (소문자, 하이픈) |
| `description` | Claude가 위임 판단에 사용하는 설명 |
| `tools` | 허용 도구 (쉼표 구분) |
| `model` | sonnet / opus / haiku / inherit |
| `skills` | 프리로드할 스킬 이름 배열 |
| `background` | true면 백그라운드 실행 |
| `isolation` | worktree면 격리된 git worktree에서 실행 |

### 도구 제한

```yaml
tools: Read, Grep, Glob           # 읽기 전용
tools: Read, Write, Edit, Bash    # 쓰기 가능
disallowedTools: Write, Edit      # 특정 도구 금지
```

## 프로젝트 에이전트 구성

```
.claude/agents/
├── planner.md       # 계획/조율 (Read, Edit)
├── backend-dev.md   # 백엔드 구현 (Read, Write, Edit, Bash)
├── frontend-dev.md  # 프론트엔드 구현 (Read, Write, Edit, Bash)
├── researcher.md    # 기술 조사 (Read, Write, WebSearch, WebFetch)
└── reviewer.md      # 코드 리뷰 (Read, Bash — 읽기 전용)
```

## 에이전트-스킬 매핑

| 에이전트 | 프리로드 스킬 |
|----------|--------------|
| planner | sync, next, done, blocked, ref |
| backend-dev | ref, done, blocked, review, test |
| frontend-dev | ref, done, blocked, review, test |
| researcher | ref, save-ref |
| reviewer | ref, review |

`skills` 필드에 지정하면 에이전트 시작 시 스킬 내용이 컨텍스트에 주입됨.

## 병렬 실행

- 의존 관계가 없는 에이전트는 동시에 실행 가능
- 메인 에이전트가 Task 도구로 여러 서브에이전트를 한 번에 호출
- 각 서브에이전트는 격리된 컨텍스트에서 실행, 결과만 반환

## 제약 사항

- 서브에이전트는 다른 서브에이전트를 생성할 수 없음 (중첩 불가)
- 서브에이전트는 메인 대화 히스토리를 볼 수 없음 (독립 컨텍스트)
- CLAUDE.md는 서브에이전트에도 자동 로드됨
