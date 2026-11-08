from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The user's message to the agent",
    )
    chat_id: int | None = Field(default=None, gt=0)


class ChatSummary(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ContextChunk(BaseModel):
    id: int | None = None
    filename: str
    chunk_index: int
    content: str
    is_primary: bool = False


class StoredMessage(BaseModel):
    id: int
    chat_id: int
    user_input: str
    ai_response: str
    created_at: datetime
    context: list[ContextChunk] = Field(default_factory=list)
    input_tokens: int | None = None
    output_tokens: int | None = None
    context_usage_percent: float | None = None
    output_usage_percent: float | None = None


class ChatResponse(BaseModel):
    response: str
    chat_id: int
    model_used: str
    context: list[ContextChunk] = Field(default_factory=list)
    cached: bool = False
    processing_time_ms: float
    security_notes: list[str] = Field(default_factory=list)
    input_tokens: int | None = None
    output_tokens: int | None = None
    context_usage_percent: float | None = None
    output_usage_percent: float | None = None
    timestamp: str = Field(default_factory=lambda: str(datetime.now(timezone.utc)))


class HealthResponse(BaseModel):
    status: str = "healthy"
    environment: str
    version: str = "0.1.0"
    checks: dict = {}


class MetricsResponse(BaseModel):
    total_requests: int
    total_errors: int
    error_rate: str
    avg_latency_ms: float
    cache_hit_rate: str
    total_input_tokens: int
    total_output_tokens: int


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    request_id: str | None = None
