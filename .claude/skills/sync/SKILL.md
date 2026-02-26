---
name: sync
description: 세션 시작 시 PLAN.md와 PROGRESS.md를 읽고 현재 프로젝트 상황을 요약한다.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep
---

프로젝트 상황을 파악하고 요약해줘.

1. `PLAN.md`를 읽고 전체 태스크 현황을 파악한다.
   - 각 Phase별 pending / in-progress / done / blocked 개수
   - 현재 진행 중인 태스크 목록
   - 블로커가 있는 태스크

2. `PROGRESS.md`를 읽고 최근 진행 기록을 파악한다.
   - 가장 최근 완료된 작업
   - "다음 할 일"로 기록된 내용

3. 다음 형식으로 요약을 출력한다:

```
## 현재 상황
- Phase: 현재 진행 중인 Phase
- 진행률: done/total 태스크

## 진행 중인 작업
- (in-progress 태스크 목록)

## 다음 할 일
- (pending이면서 의존이 해결된 태스크)

## 블로커
- (blocked 태스크와 이유, 없으면 "없음")
```
