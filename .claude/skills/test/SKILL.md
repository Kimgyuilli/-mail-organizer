---
name: test
description: backend/frontend 테스트를 실행하고 결과를 요약한다.
argument-hint: "[backend|frontend|all]"
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read, Glob
---

테스트를 실행하고 결과를 요약한다.

## 대상 결정
- `$ARGUMENTS`가 `backend`: 백엔드만
- `$ARGUMENTS`가 `frontend`: 프론트엔드만
- 비어있거나 `all`: 둘 다

## 실행

### Backend
```bash
cd backend && uv run pytest -v --tb=short 2>&1
```

### Frontend
```bash
cd frontend && pnpm test 2>&1
```

## 결과 출력
```
## 테스트 결과

### Backend
- 상태: PASS / FAIL
- 통과: N개 / 전체: M개
- 실패 목록 (있으면):
  - test_name — 실패 이유 요약

### Frontend
- 상태: PASS / FAIL
- 통과: N개 / 전체: M개
- 실패 목록 (있으면):
  - test_name — 실패 이유 요약
```

실패한 테스트가 있으면 원인을 분석하고 수정 방안을 제안한다.
