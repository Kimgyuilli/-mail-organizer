---
name: implement-task
description: PLAN.md에서 태스크를 선택하고 서브에이전트를 활용하여 구현부터 기록까지 전체 워크플로우를 수행한다.
argument-hint: "[태스크명 또는 공백=자동선택]"
user-invocable: true
disable-model-invocation: true
---

태스크 하나를 끝까지 구현하는 전체 워크플로우를 수행한다.
서브에이전트를 활용하여 조사, 구현, 리뷰를 병렬/순차로 진행한다.

## 워크플로우

### Step 1: 태스크 선택
- 인자가 있으면: `$ARGUMENTS`에 해당하는 태스크 선택
- 인자가 없으면: PLAN.md에서 `pending` + 의존 해결된 태스크를 찾아 사용자에게 확인

### Step 2: 컨텍스트 파악
- `PLAN.md`, `PROGRESS.md` 읽기
- `references/`에서 관련 자료 검색

### Step 3: 조사 (필요 시)
- 기존 레퍼런스가 부족하면 **researcher** 에이전트에게 조사를 위임한다.
- 조사와 동시에 기존 코드 탐색을 병렬로 진행할 수 있다.

### Step 4: 구현 계획
- 생성/수정할 파일 목록
- 구현 순서
- 사용자에게 계획을 보여주고 승인 받기

### Step 5: 구현
- `PLAN.md` 상태를 `in-progress`로 변경
- 태스크 성격에 따라 적절한 에이전트에게 위임:
  - 백엔드 작업 → **backend-dev** 에이전트
  - 프론트엔드 작업 → **frontend-dev** 에이전트
  - 백엔드 + 프론트엔드 동시 → 두 에이전트 **병렬 실행**
- 코드 작성은 CLAUDE.md의 컨벤션을 준수한다.

### Step 6: 리뷰
- 구현 완료 후 **reviewer** 에이전트에게 코드 리뷰를 위임한다.
- Critical 이슈가 있으면 수정 후 재리뷰한다.

### Step 7: 기록
- **planner** 에이전트를 사용하여:
  - `PLAN.md` 상태를 `done`으로 변경
  - `PROGRESS.md`에 완료 기록 추가
  - 새로 unblock된 태스크 확인

### Step 8: 요약
- 구현 내용 요약 출력
- 다음 추천 태스크 안내

## 병렬 실행 예시

태스크가 백엔드 API + 프론트엔드 UI를 동시에 필요로 할 때:
```
1. researcher → 관련 API 조사 (레퍼런스 없을 때)
2. backend-dev + frontend-dev → 병렬 구현
3. reviewer → 전체 코드 리뷰
4. planner → PLAN.md/PROGRESS.md 업데이트
```
