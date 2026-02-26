---
name: blocked
description: 태스크를 blocked 상태로 변경하고 이유를 기록한다.
argument-hint: [태스크명] [이유]
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Edit
---

태스크를 blocked 처리한다.

인자 파싱:
- 첫 번째 인자: 태스크명
- 나머지: 블로커 이유
- 인자: $ARGUMENTS

1. `PLAN.md`에서 해당 태스크를 찾아 상태를 `blocked`로 변경한다.
2. 비고 컬럼에 블로커 이유를 추가한다.
3. `PROGRESS.md` 최상단에 블로커 기록을 추가한다:
   ```
   ## YYYY-MM-DD HH:MM — agent
   ### 이슈/참고
   - **BLOCKED**: 태스크명 — 이유
   - 해결을 위해 필요한 것: (분석 내용)
   ```
4. 해결 방안이 있으면 제안한다.
