---
name: next
description: PLAN.md에서 다음으로 수행 가능한 태스크를 찾아 제안한다.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read
---

다음에 할 태스크를 찾아서 제안해줘.

1. `PLAN.md`를 읽는다.
2. 상태가 `pending`이면서, 의존(선행 태스크)이 모두 `done`인 태스크를 찾는다.
3. 여러 개가 있으면 우선순위를 제안한다:
   - 같은 Phase 내에서 위에 있는 태스크가 우선
   - 다른 태스크의 의존성이 되는 태스크가 우선
4. 다음 형식으로 출력한다:

```
## 다음 수행 가능한 태스크

### 추천
- **태스크명** (Phase N) — 추천 이유

### 그 외 수행 가능
- 태스크명 (Phase N)
```

5. 사용자가 선택하면 해당 태스크의 PLAN.md 상태를 `in-progress`로 변경한다.
