---
name: branch
description: feature 브랜치와 git worktree를 한 번에 생성한다.
argument-hint: <브랜치명> (예: feat/gmail-batch-sync)
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Edit
---

`$ARGUMENTS` 이름으로 feature 브랜치와 worktree를 생성한다.

## 사전 조건
- 인자로 브랜치명을 반드시 받아야 한다. 없으면 사용자에게 요청한다.
- 브랜치명은 `feat/`, `fix/`, `refactor/`, `docs/` 접두사를 권장한다.

## 실행 순서

1. **브랜치명 검증**
   - `$ARGUMENTS`가 비어 있으면 중단하고 사용자에게 브랜치명을 요청한다.
   - 이미 존재하는 브랜치인지 `git branch -a`로 확인한다.

2. **최신 main 가져오기**
   ```bash
   git fetch origin main
   ```

3. **worktree 경로 계산**
   - 브랜치명에서 `/`를 `-`로 변환하여 디렉토리명을 만든다.
   - 경로: `C:/Users/rlarb/coding/.worktrees/<변환된-브랜치명>`
   - 예: `feat/gmail-batch-sync` → `C:/Users/rlarb/coding/.worktrees/feat-gmail-batch-sync`

4. **worktree + 브랜치 생성**
   ```bash
   git worktree add -b <브랜치명> <worktree경로> origin/main
   ```

5. **결과 안내**
   - 생성된 worktree 경로 출력
   - 사용법 안내:
     ```
     worktree 생성 완료:
       브랜치: <브랜치명>
       경로: <worktree경로>

     이 worktree에서 작업하려면 Claude Code를 해당 경로에서 실행하세요.
     ```

6. **PLAN.md 업데이트** (선택)
   - 현재 진행 중인 태스크가 있고 비고란이 비어 있으면, 브랜치명을 기록한다.
