---
name: implement-task
description: PLAN.md에서 태스크를 선택하고 구현부터 기록까지 전체 워크플로우를 수행한다.
argument-hint: "[태스크명 또는 공백=자동선택]"
user-invocable: true
disable-model-invocation: true
---

태스크 하나를 끝까지 구현하는 전체 워크플로우를 수행한다.

## 워크플로우

### Step 1: 태스크 선택
- 인자가 있으면: `$ARGUMENTS`에 해당하는 태스크 선택
- 인자가 없으면: `/next` 로직으로 다음 수행 가능한 태스크를 찾아 사용자에게 확인

### Step 2: 컨텍스트 파악
- `PLAN.md`, `PROGRESS.md` 읽기
- 태스크와 관련된 기존 코드 탐색 (Glob, Grep, Read)
- 의존하는 태스크의 완료 결과물 확인

### Step 3: 구현 계획
- 생성/수정할 파일 목록
- 구현 순서
- 사용자에게 계획을 보여주고 승인 받기

### Step 4: 구현
- `PLAN.md` 상태를 `in-progress`로 변경
- 코드 작성 (CLAUDE.md의 컨벤션 준수)
- 필요한 패키지가 있으면 설치

### Step 5: 검증
- 관련 테스트 실행
- 린트 체크
- 실패 시 수정 반복

### Step 6: 기록
- `PLAN.md` 상태를 `done`으로 변경
- `PROGRESS.md`에 완료 기록 추가:
  - 완료한 작업 (생성/수정한 파일 목록)
  - 다음 할 일 (새로 unblock된 태스크)
  - 이슈/참고 (발견된 문제, 결정 사항)

### Step 7: 요약
- 구현 내용 요약 출력
- 다음 추천 태스크 안내
