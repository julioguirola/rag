from contextlib import asynccontextmanager
import os
import shutil
import tempfile

from fastapi import FastAPI, File, Request, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from langsmith import traceable

from app.config import get_settings
from app.models import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    MetricsResponse,
)
from app.security import SecurityPipeline
from app.cache import ResponseCache
from app.monitoring import get_logger, MetricsCollector, RequestTimer
from app.agent import ProductionAgent

from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader

security: SecurityPipeline
cache: ResponseCache
metrics: MetricsCollector
agent: ProductionAgent
logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global security, cache, metrics, agent

    settings = get_settings()

    logger.info(
        "Starting production API...",
        extra={
            "extra_data": {
                "environment": settings.app_env,
                "primary_model": settings.primary_model,
                "tracing_enabled": settings.langsmith_tracing,
            }
        },
    )

    security = SecurityPipeline()
    cache = ResponseCache(ttl_seconds=settings.cache_ttl_seconds)
    metrics = MetricsCollector()
    agent = ProductionAgent()

    logger.info("All components initialized. Ready to serve requests.")

    yield

    logger.info("Shutting down...", extra={"extra_data": metrics.summary})


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Production LangGraph API",
    description="A production-ready chat API with security, caching, and observability.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter

# === Exception Handlers ===


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors."""
    logger.warning(
        "Rate limit exceeded",
        extra={
            "extra_data": {
                "client_ip": get_remote_address(request),
            }
        },
    )
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": "Too many requests. Please slow down.",
        },
    )


@app.post("/chat", response_model=ChatResponse)
@limiter.limit(get_settings().rate_limit)
@traceable(name="chat_endpoint")
async def chat(request: Request, body: ChatRequest):
    """
    Main chat endpoint.

    Flow:
    1. Security check (injection + PII masking)
    2. Cache lookup
    3. LangGraph agent invoke (if cache miss)
    4. Output validation
    5. Cache store
    6. Return response
    """
    with RequestTimer() as timer:
        security_notes = []

        # ---- Step 1: Security Check ----
        is_allowed, cleaned_message, notes = security.check_input(body.message)
        security_notes.extend(notes)

        if not is_allowed:
            logger.warning(
                "Request blocked by security",
                extra={
                    "extra_data": {
                        "reason": notes,
                        # "thread_id": body.thread_id,
                    }
                },
            )
            metrics.record_request(latency_ms=0, error=True)
            raise HTTPException(
                status_code=400,
                detail="Your message was blocked by our security filters.",
            )

        # ---- Step 2: Cache Lookup ----
        cached_response = cache.get(cleaned_message)
        if cached_response is not None:
            metrics.record_request(latency_ms=0, cache_hit=True)
            logger.info(
                "Cache hit",
                extra={
                    "extra_data": {
                        # "thread_id": body.thread_id,
                    }
                },
            )
            return ChatResponse(
                response=cached_response,
                # thread_id=body.thread_id,
                model_used="cache",
                cached=True,
                processing_time_ms=0,
            )

        # ---- Step 3: Invoke LangGraph Agent ----
        try:
            result = agent.invoke(cleaned_message)
        except Exception as e:
            logger.error(
                f"Agent invocation failed: {e}",
                extra={
                    "extra_data": {
                        # "thread_id": body.thread_id,
                        "error": str(e),
                    }
                },
            )
            metrics.record_request(latency_ms=0, error=True)
            raise HTTPException(
                status_code=500,
                detail="An error occurred while processing your request.",
            )

        response_text = result["response"]
        model_used = result["model_used"]

        # ---- Step 4: Output Validation ----
        validated_response, output_warnings = security.check_output(response_text)
        security_notes.extend(output_warnings)

        # ---- Step 5: Cache Store ----
        cache.set(cleaned_message, validated_response)

    # ---- Step 6: Log & Record Metrics ----
    input_tokens = int(len(cleaned_message.split()) * 1.3)
    output_tokens = int(len(validated_response.split()) * 1.3)

    metrics.record_request(
        latency_ms=timer.elapsed_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cache_hit=False,
    )

    if security_notes:
        logger.info(
            "Security notes",
            extra={
                "extra_data": {
                    "notes": security_notes,
                    # "thread_id": body.thread_id,
                }
            },
        )

    logger.info(
        "Request completed",
        extra={
            "extra_data": {
                # "thread_id": body.thread_id,
                "model_used": model_used,
                "latency_ms": round(timer.elapsed_ms, 2),
            }
        },
    )

    return ChatResponse(
        response=validated_response,
        # thread_id=body.thread_id,
        model_used=model_used,
        cached=False,
        processing_time_ms=round(timer.elapsed_ms, 2),
        security_notes=security_notes,
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check for Docker/Kubernetes."""
    settings = get_settings()

    checks = {
        "agent": agent is not None,
        "security": security is not None,
        "cache": cache is not None,
    }

    all_healthy = all(checks.values())

    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        environment=settings.app_env,
        checks=checks,
    )


@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Metrics for monitoring dashboards."""
    summary = metrics.summary
    return MetricsResponse(**summary)


@app.get("/cache/stats")
async def cache_stats():
    """Cache performance statistics"""
    return cache.stats


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    "application/pdf"
    "application/vnd.ms-excel"
    "application/msword"
    "text/plain; charset=utf-8"
    # if (
    #     file.content_type
    #     != "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    # ):
    #     raise HTTPException(status_code=400, detail="Solo se permiten Docx")

    # Guardar en un archivo temporal
    # with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
    #     shutil.copyfileobj(file.file, tmp)
    #     tmp_path = tmp.name

    # try:
    #     loader = Docx2txtLoader(tmp_path)
    #     docs = await loader.aload()  # versión async, no bloquea el event loop
    # finally:
    #     os.remove(tmp_path)  # limpiar el temporal siempre

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        # "num_pages": len(docs),
        # "first_page_preview": docs[0].page_content[:300] if docs else "",
        # "metadata": docs[0].metadata if docs else {},
    }
