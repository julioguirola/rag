from contextlib import asynccontextmanager
import json
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timedelta

from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import redis
from minio import Minio
from fastapi.responses import JSONResponse
import psycopg
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
minio_client: Minio
redis_client: redis.Redis
logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global security, cache, metrics, agent, minio_client, redis_client

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

    # MinIO client + bucket
    minio_client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )
    if not minio_client.bucket_exists(settings.minio_bucket):
        minio_client.make_bucket(settings.minio_bucket)

    # Redis client (queue)
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)

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

# === CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/msword",
    "text/plain; charset=utf-8",
}


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str


class UploadCompleteRequest(BaseModel):
    object_name: str
    filename: str
    content_type: str
    size: int


@app.post("/upload/presigned-url")
async def get_upload_presigned_url(body: PresignedUrlRequest):
    """Generate a presigned PUT URL so the frontend can upload directly to MinIO (bypassing the backend)."""
    content_type = body.content_type or ""

    is_allowed = content_type in ALLOWED_CONTENT_TYPES or content_type.startswith(
        "text/plain"
    )
    if not is_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: {content_type}",
        )

    settings = get_settings()

    # Unique object name to avoid collisions in the bucket
    object_name = f"{uuid.uuid4().hex}_{body.filename}"

    # Generamos la presigned URL con un cliente MinIO que use el endpoint
    # público (localhost:9000) para que la firma coincida con el host al que
    # el frontend hará PUT. El cliente interno (minio_client, bucket:9000)
    # sigue usándose para las operaciones reales del backend.
    signing_client = Minio(
        settings.minio_public_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
        region="us-east-1",
    )

    upload_url = signing_client.presigned_put_object(
        settings.minio_bucket,
        object_name,
        expires=timedelta(minutes=15),
    )

    return {
        "upload_url": upload_url,
        "object_name": object_name,
        "filename": body.filename,
        "content_type": content_type,
        "bucket": settings.minio_bucket,
        "expires_in": 900,
    }


class DocumentProgress(BaseModel):
    id: int
    filename: str
    processed_chunks: int = Field(ge=0)
    total_chunks: int = Field(ge=0)
    progress_percentage: float = Field(ge=0, le=100)
    status: str
    created_at: datetime


@app.get("/documents", response_model=list[DocumentProgress])
async def list_documents():
    """Return uploaded files and their current chunk processing progress."""
    settings = get_settings()

    try:
        with psycopg.connect(
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.postgres_db,
            user=settings.postgres_user,
            password=settings.postgres_password,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        d.id,
                        d.filename,
                        COUNT(c.embedding)::int AS processed_chunks,
                        COALESCE((d.metadata->>'total_chunks')::int, 0)
                            AS total_chunks,
                        d.created_at
                    FROM documents AS d
                    LEFT JOIN chunks AS c ON c.document_id = d.id
                    GROUP BY d.id, d.filename, d.metadata, d.created_at
                    ORDER BY d.created_at DESC, d.id DESC
                    """
                )
                rows = cursor.fetchall()
    except psycopg.Error as error:
        logger.error(
            "Could not retrieve document progress",
            extra={"extra_data": {"error": str(error)}},
        )
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar el progreso de los archivos.",
        ) from error

    documents = []
    for document_id, filename, processed_chunks, total_chunks, created_at in rows:
        progress = (
            100.0
            if total_chunks == 0
            else min(100.0, processed_chunks / total_chunks * 100)
        )
        status = (
            "completed"
            if progress >= 100
            else "processing"
            if processed_chunks > 0
            else "queued"
        )
        documents.append(
            DocumentProgress(
                id=document_id,
                filename=filename,
                processed_chunks=processed_chunks,
                total_chunks=total_chunks,
                progress_percentage=round(progress, 2),
                status=status,
                created_at=created_at,
            )
        )

    return documents


@app.post("/documents/{document_id}/retry-embeddings")
async def retry_document_embeddings(document_id: int):
    """Queue a retry for the chunks of a document that have no embedding."""
    settings = get_settings()

    try:
        with psycopg.connect(
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.postgres_db,
            user=settings.postgres_user,
            password=settings.postgres_password,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT filename FROM documents WHERE id = %s",
                    (document_id,),
                )
                document = cursor.fetchone()
    except psycopg.Error as error:
        logger.error(
            "Could not find document for embedding retry",
            extra={"extra_data": {"document_id": document_id, "error": str(error)}},
        )
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar el archivo.",
        ) from error

    if document is None:
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")

    payload = {
        "type": "retry_embeddings",
        "document_id": document_id,
    }
    redis_client.lpush(settings.upload_queue_name, json.dumps(payload))
    logger.info(
        "Embedding retry enqueued",
        extra={"extra_data": payload},
    )
    return {"document_id": document_id, "queued": True}


@app.post("/upload/complete")
async def upload_complete(body: UploadCompleteRequest):
    """Called by the frontend after a successful direct upload to enqueue the file for processing."""
    settings = get_settings()

    payload = {
        "filename": body.filename,
        "content_type": body.content_type,
        "bucket": settings.minio_bucket,
        "object_name": body.object_name,
        "size": body.size,
    }
    redis_client.lpush(settings.upload_queue_name, json.dumps(payload))

    logger.info(
        "File upload completed and enqueued",
        extra={"extra_data": payload},
    )

    return {
        "filename": body.filename,
        "object_name": body.object_name,
        "queued": True,
    }
