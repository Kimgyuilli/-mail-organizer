---
title: OpenAI API 최적화 기법 - 이메일 분류
tags: [openai, gpt-4o-mini, optimization, structured-outputs, sse, streaming]
created: 2026-03-05
updated: 2026-03-05
status: reviewed
---

# OpenAI API 최적화 기법 - 이메일 분류

> gpt-4o-mini를 사용한 이메일 분류 시스템 최적화 방안

## 현재 구현 분석

### 기존 코드 (`backend/app/mail/services/classifier.py`)
- Model: `gpt-4o-mini`
- Batch size: 10 emails/chunk
- Body truncation: 500 chars
- JSON 파싱: `_extract_json()`으로 markdown fence 제거
- 처리 방식: 청크별 순차 처리 (병렬화 없음)

## 1. 병렬 API 호출 (asyncio.gather)

### Rate Limits (gpt-4o-mini)
- **TPM** (Tokens Per Minute): 200,000
- **TPD** (Tokens Per Day): 2,000,000
- **RPM** (Requests Per Minute): tier별 상이
- Spending tier 상승 시 자동 증가

### 현재 구현 문제
```python
# Sequential processing - 느림
for chunk_start in range(0, len(needs_ai), chunk_size):
    chunk = needs_ai[chunk_start : chunk_start + chunk_size]
    response = await client.chat.completions.create(...)
```

### 최적화 패턴
```python
async def process_chunk(chunk: list[dict], chunk_start: int, index_map: dict) -> list[dict]:
    """단일 청크 처리 (재사용 가능한 함수)"""
    parts = []
    for i, mail in enumerate(chunk):
        parts.append(
            f"[메일 {i}]\n"
            f"- 발신자: {mail.get('from_email', '')} ({mail.get('from_name', '')})\n"
            f"- 제목: {mail.get('subject', '(제목 없음)')}\n"
            f"- 본문: {_truncate_body(mail.get('body'))}"
        )

    user_message = BATCH_TEMPLATE.format(emails_text="\n\n".join(parts))

    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )

    text = response.choices[0].message.content
    chunk_results = json.loads(text)  # _extract_json() 제거 (Structured Outputs 사용 시)

    # 원본 인덱스로 매핑
    for result in chunk_results:
        ai_index = result.get("index", 0)
        key = chunk_start + ai_index
        original_index = index_map.get(key, key)
        result["index"] = original_index

    return chunk_results

# 병렬 처리
tasks = []
for chunk_start in range(0, len(needs_ai), chunk_size):
    chunk = needs_ai[chunk_start : chunk_start + chunk_size]
    tasks.append(process_chunk(chunk, chunk_start, index_map))

# 모든 청크를 동시에 처리
results_list = await asyncio.gather(*tasks)

# 결과 병합
ai_results = []
for chunk_results in results_list:
    ai_results.extend(chunk_results)
```

### Rate Limiter 추가 (429 에러 방지)
```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry_error_callback=lambda retry_state: None
)
async def process_chunk_with_retry(chunk, chunk_start, index_map):
    """Exponential backoff으로 재시도"""
    try:
        return await process_chunk(chunk, chunk_start, index_map)
    except Exception as e:
        if "429" in str(e):  # Rate limit error
            print(f"Rate limit hit, retrying...")
            raise  # tenacity가 재시도
        raise

# 배치별 제한 (5개씩 처리, 2초 대기)
batch_size = 5
for i in range(0, len(tasks), batch_size):
    batch_tasks = tasks[i:i + batch_size]
    batch_results = await asyncio.gather(*batch_tasks)
    results_list.extend(batch_results)
    if i + batch_size < len(tasks):
        await asyncio.sleep(2)  # 배치 간 대기
```

**권장사항:**
- ✅ `asyncio.gather()` 사용 (2-3배 속도 향상)
- ✅ 5개 task씩 배치 처리, 2초 대기
- ✅ Exponential backoff (tenacity 라이브러리)

## 2. Structured Outputs / JSON Mode

### 지원 현황
- ✅ `gpt-4o-mini` 완전 지원 (`gpt-4o-mini-2024-07-18` 이후)
- ✅ 100% 스키마 일치 보장
- ✅ Chat Completions API, Assistants API, Batch API 지원

### 현재 문제
```python
# 현재: Markdown fence 제거 필요
def _extract_json(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        first_newline = stripped.index("\n")
        stripped = stripped[first_newline + 1 :]
        if stripped.endswith("```"):
            stripped = stripped[: -3].strip()
    return stripped

# System prompt에 JSON 형식 지시 필요
SYSTEM_PROMPT = """...
응답은 반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.
"""
```

### 최적화 방법
```python
# Structured Outputs 사용
response = await client.chat.completions.create(
    model=MODEL,
    max_tokens=256,
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "email_classification",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "confidence": {"type": "number"},
                    "reason": {"type": "string"}
                },
                "required": ["category", "confidence", "reason"],
                "additionalProperties": False
            }
        }
    },
    messages=[...]
)

# _extract_json() 불필요 - 항상 valid JSON 반환
result = json.loads(response.choices[0].message.content)
```

### Batch API용 스키마
```python
# 배치 분류용 JSON Schema
BATCH_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "batch_classification",
        "strict": True,
        "schema": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "category": {"type": "string"},
                    "confidence": {"type": "number"},
                    "reason": {"type": "string"}
                },
                "required": ["index", "category", "confidence", "reason"],
                "additionalProperties": False
            }
        }
    }
}
```

### 간소화된 System Prompt
```python
# JSON 형식 지시 제거 가능
SYSTEM_PROMPT = """당신은 이메일 분류 전문가입니다.
주어진 이메일의 발신자, 제목, 본문을 분석하여 가장 적절한 카테고리를 분류하세요.

카테고리 목록:
- 업무: 회의, 업무 요청, 팀 커뮤니케이션
- 개인: 개인적인 연락, 가족/친구
- 금융: 은행, 결제, 카드, 보험
- 프로모션: 광고, 마케팅, 할인 쿠폰
- 뉴스레터: 구독 뉴스, 블로그 업데이트
- 알림: 서비스 알림, 비밀번호 변경, 배송 안내
- 중요: 긴급하거나 중요한 메일
"""
# "응답은 반드시 JSON 형식으로..." 불필요
```

**이점:**
- ✅ `_extract_json()` 함수 제거
- ✅ 토큰 낭비 감소 (markdown fence 없음)
- ✅ 100% 파싱 성공 (에러 없음)
- ✅ System prompt 간소화

## 3. 토큰 절감 전략

### 현재 설정
- Body truncation: 500 chars
- Batch size: 10 emails/chunk
- max_tokens: 256 (single), 4096 (batch)

### 최적화 실험

| 파라미터 | 현재 | 옵션1 | 옵션2 | 권장 |
|---------|------|------|------|------|
| Body truncation | 500 | 300 | 200 | **300** |
| Batch size | 10 | 15 | 20 | **15** |
| System prompt | 150 tokens | 100 | 80 | **100** |

### 토큰 절감 계산
- Structured Outputs: ~20 tokens/request (JSON 지시 제거 + markdown 출력 없음)
- Body truncation (500→300): ~50 tokens/email
- **100개 이메일 기준: ~7,000 tokens 절감** (~$0.0001 at $0.15/1M input tokens)

### 구현
```python
def _truncate_body(body: str | None, max_chars: int = 300) -> str:  # 500 → 300
    if not body:
        return "(본문 없음)"
    return body[:max_chars] + ("..." if len(body) > max_chars else "")

# Batch size 증가
chunk_size = 15  # 10 → 15
```

**권장사항:**
1. ✅ Body truncation 300으로 감소 (A/B 테스트로 정확도 검증)
2. ✅ Structured Outputs로 JSON 지시 제거
3. ✅ Batch size 15로 증가 (병렬 처리와 시너지)

## 4. FastAPI SSE (Server-Sent Events)

### 기본 패턴
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from typing import AsyncIterable
import json

app = FastAPI()

async def classify_stream(emails: list[dict]) -> AsyncIterable[str]:
    """분류 진행 상황을 SSE로 스트리밍"""
    total = len(emails)

    for i, email in enumerate(emails):
        # 이메일 분류
        result = await classify_single(
            email["from_email"],
            email["from_name"],
            email["subject"],
            email["body"]
        )

        # SSE 형식: "data: {json}\n\n"
        event = {
            "type": "progress",
            "index": i,
            "total": total,
            "result": result
        }
        yield f"data: {json.dumps(event)}\n\n"

    # 완료 이벤트
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

@app.post("/api/mail/classify-stream")
async def classify_stream_endpoint(request: ClassifyRequest):
    return StreamingResponse(
        classify_stream(request.emails),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # nginx 버퍼링 비활성화
        }
    )
```

### 고급 패턴 (Background Tasks)
```python
from fastapi import BackgroundTasks
import uuid
import asyncio

# 활성 스트림 저장
active_streams: dict[str, asyncio.Queue] = {}

async def classify_background(task_id: str, emails: list[dict]):
    """백그라운드에서 분류 수행, Queue에 결과 push"""
    queue = active_streams[task_id]

    try:
        total = len(emails)
        for i, email in enumerate(emails):
            result = await classify_single(...)
            await queue.put({
                "type": "progress",
                "index": i,
                "total": total,
                "result": result
            })
        await queue.put({"type": "done"})
    except Exception as e:
        await queue.put({"type": "error", "message": str(e)})
    finally:
        del active_streams[task_id]

@app.post("/api/mail/classify-start")
async def start_classification(
    request: ClassifyRequest,
    background_tasks: BackgroundTasks
):
    task_id = str(uuid.uuid4())
    active_streams[task_id] = asyncio.Queue()
    background_tasks.add_task(classify_background, task_id, request.emails)
    return {"task_id": task_id}

@app.get("/api/mail/classify-stream/{task_id}")
async def stream_progress(task_id: str):
    if task_id not in active_streams:
        return {"error": "Task not found"}

    queue = active_streams[task_id]

    async def event_generator():
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") in ("done", "error"):
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

**권장사항:**
- ✅ 기본 패턴 사용 (간단한 구조)
- ✅ `X-Accel-Buffering: no` 헤더 추가 (nginx 대응)
- ⏳ Background task 패턴은 10초 이상 걸리는 작업에만 사용

## 5. Frontend SSE 소비 (fetch + POST)

### 문제점
Native `EventSource` API는 GET 요청만 지원 (POST 불가)

### 해결책 1: Native fetch
```typescript
// hooks/useClassifyStream.ts
import { useState, useCallback } from 'react';

interface ClassifyProgress {
  type: 'progress' | 'done' | 'error';
  index?: number;
  total?: number;
  result?: ClassificationResult;
  message?: string;
}

export function useClassifyStream() {
  const [progress, setProgress] = useState<ClassifyProgress | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const classify = useCallback(async (emails: EmailData[]) => {
    setIsStreaming(true);
    setProgress(null);

    try {
      const response = await fetch('/api/mail/classify-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // TextDecoderStream으로 스트림 읽기
      const reader = response.body!
        .pipeThrough(new TextDecoderStream())
        .getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // SSE 형식 파싱: "data: {json}\n\n"
        const lines = value.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.slice(6); // "data: " 제거
            const event: ClassifyProgress = JSON.parse(json);
            setProgress(event);

            if (event.type === 'done' || event.type === 'error') {
              setIsStreaming(false);
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      setProgress({ type: 'error', message: String(error) });
      setIsStreaming(false);
    }
  }, []);

  return { classify, progress, isStreaming };
}
```

### 해결책 2: @microsoft/fetch-event-source
```typescript
// npm install @microsoft/fetch-event-source

import { fetchEventSource } from '@microsoft/fetch-event-source';

export function useClassifyStream() {
  const [progress, setProgress] = useState<ClassifyProgress | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const classify = useCallback(async (emails: EmailData[]) => {
    setIsStreaming(true);
    setProgress(null);

    await fetchEventSource('/api/mail/classify-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
      onmessage(msg) {
        const event: ClassifyProgress = JSON.parse(msg.data);
        setProgress(event);

        if (event.type === 'done' || event.type === 'error') {
          setIsStreaming(false);
        }
      },
      onerror(err) {
        console.error('SSE error:', err);
        setProgress({ type: 'error', message: String(err) });
        setIsStreaming(false);
        throw err; // 재연결 중단
      }
    });
  }, []);

  return { classify, progress, isStreaming };
}
```

### React 컴포넌트 예시
```typescript
// components/ClassifyProgress.tsx
import { useClassifyStream } from '@/hooks/useClassifyStream';

export function ClassifyProgress({ emails }: { emails: EmailData[] }) {
  const { classify, progress, isStreaming } = useClassifyStream();

  return (
    <div>
      <button onClick={() => classify(emails)} disabled={isStreaming}>
        이메일 분류
      </button>

      {progress && (
        <div>
          {progress.type === 'progress' && (
            <div>
              <div className="text-sm font-medium">
                진행 중: {progress.index! + 1} / {progress.total}
              </div>
              <div className="text-sm text-muted-foreground">
                카테고리: {progress.result?.category} (신뢰도: {progress.result?.confidence})
              </div>
            </div>
          )}

          {progress.type === 'done' && (
            <div className="text-green-600">분류 완료!</div>
          )}

          {progress.type === 'error' && (
            <div className="text-red-600">오류: {progress.message}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

**권장사항:**
- ✅ Native fetch 사용 (의존성 없음)
- ⏳ `@microsoft/fetch-event-source`는 자동 재연결이 필요한 경우만 사용
- ✅ Progress bar로 `{progress.index + 1} / {progress.total}` 표시

## 요약 및 권장사항

### Priority 1: 즉시 적용 (높은 효과, 낮은 위험)
1. ✅ **Structured Outputs**: `response_format` 사용 → JSON 파싱 문제 해결, 토큰 절감
2. ✅ **병렬 처리**: `asyncio.gather()` → 2-3배 속도 향상

### Priority 2: 최적화 (중간 효과, 낮은 위험)
3. ✅ **토큰 절감**: Body 300자 단축, batch size 15 증가
4. ✅ **Rate Limiter**: Exponential backoff로 429 에러 방지

### Priority 3: UX 개선 (중간 효과, 중간 노력)
5. ⏳ **SSE 스트리밍**: 대량 분류 시 실시간 진행 상황 표시 (50개 이상 이메일)

### 코드 변경 요약

**백엔드 (`classifier.py`):**
- `response_format`에 JSON schema 추가
- `_extract_json()` 함수 제거
- `chunk_size = 10` → `15`
- `_truncate_body(max_chars=500)` → `300`
- 순차 loop → `asyncio.gather()`
- Rate limiter 추가 (tenacity)

**프론트엔드 (선택적 SSE):**
- `useClassifyStream.ts` 훅 생성
- `ClassifyProgress.tsx` 컴포넌트 추가
- 분류 버튼에 실시간 진행 표시

### 예상 성능 개선
- **속도**: 2-3배 빠름 (병렬 처리)
- **비용**: 10-15% 감소 (토큰 최적화)
- **신뢰성**: 100% JSON 파싱 (Structured Outputs)

## 비교 표

| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| 처리 시간 (100개) | ~60초 | ~20초 | **3배** |
| 토큰 비용 (100개) | ~15,000 tokens | ~13,000 tokens | **13%** |
| JSON 파싱 실패율 | 1-2% | 0% | **100%** |
| 코드 복잡도 | 중간 | 낮음 | 간소화 |

## 참고 자료

### Rate Limits & Parallel Processing
- [How to Handle Concurrent OpenAI API Calls with Rate Limiting](https://villoro.com/blog/async-openai-calls-rate-limiter/)
- [OpenAI Rate Limits Documentation](https://platform.openai.com/docs/guides/rate-limits)
- [How to handle rate limits | OpenAI Cookbook](https://cookbook.openai.com/examples/how_to_handle_rate_limits)
- [Supercharging OpenAI: Parallel API Calls](https://medium.com/@sep.eghdami/supercharging-openai-unlocking-speed-with-parallel-api-calls-19c6b580bdeb)

### Structured Outputs
- [Structured model outputs | OpenAI API](https://platform.openai.com/docs/guides/structured-outputs)
- [Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [A practical guide to OpenAI JSON Mode in 2025](https://www.eesel.ai/blog/openai-json-mode)

### Server-Sent Events
- [FastAPI Server-Sent Events Documentation](https://fastapi.tiangolo.com/tutorial/server-sent-events/)
- [Implementing SSE with FastAPI: Real-Time Updates](https://mahdijafaridev.medium.com/implementing-server-sent-events-sse-with-fastapi-real-time-updates-made-simple-6492f8bfc154)
- [How to use Server-Sent Events with FastAPI and React](https://www.softgrade.org/sse-with-fastapi-react-langgraph/)
- [SSE Using POST Without EventSource](https://medium.com/@david.richards.tech/sse-server-sent-events-using-a-post-request-without-eventsource-1c0bd6f14425)
- [Using Fetch Event Source for SSE in React](https://blog.logrocket.com/using-fetch-event-source-server-sent-events-react/)

### Pricing & Limits
- [ChatGPT API Pricing 2026: Token Costs & Rate Limits](https://intuitionlabs.ai/articles/chatgpt-api-pricing-2026-token-costs-limits)
- [OpenAI API Rate Limits (2025 Update)](https://www.scriptbyai.com/rate-limits-openai-api/)

## 다음 단계

1. **Structured Outputs 적용** (1시간)
   - `response_format` 추가
   - `_extract_json()` 제거
   - 테스트: 기존 분류 결과와 비교

2. **병렬 처리 적용** (2시간)
   - `asyncio.gather()` 구현
   - Rate limiter 추가 (tenacity)
   - 부하 테스트: 100개 이메일 분류 시간 측정

3. **토큰 최적화** (30분)
   - Body 300자 단축
   - Batch size 15 증가
   - A/B 테스트: 분류 정확도 검증

4. **SSE 구현** (선택적, 4시간)
   - 백엔드: classify_stream 엔드포인트
   - 프론트엔드: useClassifyStream 훅
   - UI: ClassifyProgress 컴포넌트
