---
name: done
description: 태스크를 완료 처리하고 PLAN.md, PROGRESS.md를 업데이트한다.
argument-hint: [태스크명]
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Edit
---

"$ARGUMENTS" 태스크를 완료 처리한다.

1. `PLAN.md`를 읽고 해당 태스크를 찾는다.
   - 태스크명이 정확히 일치하지 않아도 가장 유사한 것을 매칭한다.
   - 매칭이 애매하면 사용자에게 확인한다.

2. `PLAN.md`에서 해당 태스크의 상태를 `done`으로 변경한다.

3. `PROGRESS.md` 최상단에 완료 기록을 추가한다:
   ```
   ## YYYY-MM-DD HH:MM — agent
   ### 완료한 작업
   - 태스크명 완료 (관련 파일 경로들)
   ### 다음 할 일
   - (이 태스크 완료로 새로 수행 가능해진 태스크)
   ### 이슈/참고
   - (특이사항, 없으면 생략)
   ```

4. 완료로 인해 unblock된 다른 태스크가 있으면 알려준다.
