---
name: review
description: 최근 변경된 코드를 리뷰하고 버그, 보안, 컨벤션 위반을 체크한다.
argument-hint: "[파일경로 또는 공백=최근변경]"
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash
---

코드 리뷰를 수행한다.

## 대상 파일 결정
- 인자가 있으면: `$ARGUMENTS` 파일을 리뷰
- 인자가 없으면: `git diff --name-only HEAD~1` 또는 `git diff --name-only --staged`로 최근 변경 파일 확인

## 리뷰 체크리스트

### 1. 버그/로직 오류
- 엣지 케이스 누락
- 잘못된 조건문/반환값
- 리소스 누수 (파일 핸들, DB 커넥션 등)

### 2. 보안
- API 키/시크릿 하드코딩
- SQL 인젝션, XSS 가능성
- OAuth 토큰 처리 (평문 저장, 로그 노출)
- `.env` 파일이 .gitignore에 포함되어 있는지

### 3. 컨벤션 (CLAUDE.md 기준)
- Backend: 타입 힌트 존재 여부, snake_case
- Frontend: TypeScript strict, 적절한 타입 정의
- API 응답: snake_case 키

### 4. 성능
- 불필요한 API 호출 (N+1 등)
- 대량 메일 처리 시 배치/페이지네이션 적용 여부

## 출력 형식
```
## 코드 리뷰 결과

### Critical (즉시 수정 필요)
- [파일:라인] 설명

### Warning (개선 권장)
- [파일:라인] 설명

### Info (참고)
- [파일:라인] 설명

### 요약
- 전체 평가 한 줄
```
