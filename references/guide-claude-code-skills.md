---
title: Claude Code 스킬/커맨드 구조 가이드
tags: [claude-code, skills, commands, dev-tooling]
created: 2026-02-26
updated: 2026-02-26
status: reviewed
---

# Claude Code 스킬/커맨드 구조 가이드

## 디렉토리 구조

```
.claude/skills/<skill-name>/
├── SKILL.md           # 메인 지시문 (필수)
├── template.md        # 템플릿 (선택)
├── examples/          # 예시 (선택)
└── scripts/           # 스크립트 (선택)
```

- **프로젝트 레벨**: `.claude/skills/<name>/SKILL.md`
- **유저 레벨**: `~/.claude/skills/<name>/SKILL.md`
- **레거시 커맨드**: `.claude/commands/<name>.md` (여전히 동작)

## SKILL.md frontmatter

```yaml
---
name: my-skill              # 소문자, 숫자, 하이픈 (최대 64자)
description: 설명            # Claude가 자동 로딩 판단에 사용
argument-hint: [arg1] [arg2] # 자동완성 시 힌트
user-invocable: true         # false면 /메뉴에서 숨김
disable-model-invocation: false  # true면 Claude가 자동 호출 안 함
allowed-tools: Read, Grep    # 권한 없이 사용 가능한 도구
context: fork                # fork면 격리된 서브에이전트에서 실행
agent: Explore               # context: fork 시 서브에이전트 타입
---
```

## 변수 치환

| 변수 | 설명 |
|------|------|
| `$ARGUMENTS` | 전체 인자 문자열 |
| `$ARGUMENTS[N]` / `$N` | N번째 인자 (0-based) |
| `${CLAUDE_SESSION_ID}` | 현재 세션 ID |

## 동적 컨텍스트 (셸 명령 실행)

```markdown
현재 브랜치: !`git branch --show-current`
최근 변경: !`git diff --name-only HEAD~3`
```

`!` 백틱으로 감싼 셸 명령이 스킬 로딩 시 실행되어 결과가 주입됨.

## 우선순위 (이름 충돌 시)

Enterprise > Personal (~/.claude) > Project (.claude) > Plugin

## 참고 링크

- https://docs.anthropic.com/en/docs/claude-code/skills
