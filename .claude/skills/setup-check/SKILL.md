---
name: setup-check
description: 개발 환경과 필수 설정이 올바른지 점검한다.
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read, Glob
---

개발 환경을 점검하고 누락된 항목을 알려준다.

## 체크 항목

### 1. 런타임
- [ ] Python 3.12+ 설치 여부: `python --version`
- [ ] Node.js 18+ 설치 여부: `node --version`
- [ ] uv 설치 여부: `uv --version`
- [ ] pnpm 설치 여부: `pnpm --version`

### 2. 프로젝트 구조
- [ ] `backend/pyproject.toml` 존재
- [ ] `frontend/package.json` 존재
- [ ] `.gitignore` 존재하고 `.env`, `node_modules`, `__pycache__` 포함

### 3. 환경변수
- [ ] `backend/.env` 존재
- [ ] `backend/.env`에 필수 키 포함:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `ANTHROPIC_API_KEY`
- [ ] `frontend/.env.local` 존재 (필요 시)

### 4. 의존성
- [ ] Backend 의존성 설치: `cd backend && uv sync`
- [ ] Frontend 의존성 설치: `cd frontend && pnpm install`

## 출력 형식
```
## 환경 점검 결과

| 항목 | 상태 | 비고 |
|------|------|------|
| Python | OK / MISSING | 버전 |
| Node.js | OK / MISSING | 버전 |
| ... | ... | ... |

### 필요한 조치
1. (누락된 항목에 대한 설치/설정 가이드)
```
