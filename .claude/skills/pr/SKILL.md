---
name: pr
description: 현재 브랜치에서 PR을 생성한다.
argument-hint: "[추가 설명 또는 공백]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

현재 feature 브랜치의 변경 내용을 분석하여 GitHub PR을 생성한다.

## 실행 순서

1. **브랜치 확인**
   ```bash
   git branch --show-current
   ```
   - `main` 브랜치이면 "main에서는 PR을 생성할 수 없습니다"라고 안내하고 중단한다.

2. **푸시 확인**
   - 리모트에 현재 브랜치가 있는지 확인한다.
   - 없거나 뒤처져 있으면 `git push -u origin <브랜치>` 실행한다.

3. **기존 PR 확인**
   ```bash
   gh pr list --head <브랜치명> --state open
   ```
   - 이미 열린 PR이 있으면 해당 URL을 안내하고 중단한다.

4. **변경 내용 분석**
   ```bash
   git log main..HEAD --oneline
   git diff main...HEAD --stat
   ```
   - 커밋 메시지와 변경된 파일을 기반으로 PR 제목과 본문을 생성한다.

5. **PR 제목/본문 생성 규칙**
   - 제목: 70자 이내, Conventional Commits 스타일 (한글 허용)
   - 본문 형식:
     ```markdown
     ## Summary
     - 변경 내용 요약 (1~3줄)

     ## Changes
     - 변경된 주요 파일/기능 목록

     ## Test plan
     - [ ] 테스트/검증 항목
     ```
   - `$ARGUMENTS`가 있으면 본문에 추가 컨텍스트로 반영한다.

6. **PR 생성**
   ```bash
   gh pr create --title "<제목>" --body "<본문>"
   ```

7. **결과 출력**
   - PR URL을 출력한다.
   - PLAN.md에 관련 태스크가 있으면 비고란에 PR URL을 기록한다.
