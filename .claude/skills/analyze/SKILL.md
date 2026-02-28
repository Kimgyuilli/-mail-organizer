---
name: analyze
description: 리팩토링 전 파일/모듈의 복잡도를 정량 분석한다. 줄 수, 함수 수, 중복 패턴, React 훅 수 등을 측정.
argument-hint: "[파일경로 또는 디렉토리]"
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash
---

파일 또는 모듈의 구조적 복잡도를 정량 분석한다. 읽기 전용 — 코드를 수정하지 않는다.

## 대상 결정
- 인자가 있으면: `$ARGUMENTS` 대상을 분석
- 인자가 없으면: `backend/app/` + `frontend/src/` 전체를 분석

## 분석 항목

### 공통
- 파일별 줄 수 (300줄 초과 시 경고)
- 함수/메서드 수
- 중복 패턴 탐지 (동일 함수명이 2개+ 파일에 존재)

### Backend (Python)
- 라우터 파일에 직접 DB 쿼리 존재 여부 (services로 추출 대상)
- `async def` 함수당 줄 수 (30줄 초과 시 경고)
- import 중복/순환 의심

### Frontend (TypeScript/React)
- `useState` 호출 수 (10개 초과 시 커스텀 훅 추출 권장)
- `useEffect` 호출 수
- 인라인 컴포넌트 정의 수 (파일 내 `function` 또는 `const ... = (` 패턴)
- 컴포넌트당 JSX 줄 수

## 출력 형식
```
## 구조 분석 결과

### 파일 크기
| 파일 | 줄 수 | 상태 |
|------|-------|------|
| path/to/file.py | 410 | ⚠️ 300줄 초과 |

### 복잡도 지표
| 파일 | 함수 수 | useState | useEffect | 비고 |
|------|---------|----------|-----------|------|

### 중복 패턴
| 함수/패턴 | 위치 | 추출 대상 |
|-----------|------|-----------|

### 리팩토링 우선순위 (높음→낮음)
1. 파일명 — 이유 (줄 수, 중복 등)
```
