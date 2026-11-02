from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The user's message to the agent",
    )


class ChatResponse(BaseModel):
    response: str
    model_used: str
    cached: bool = False
    processing_time_ms: float
    security_notes: list[str] = Field(default_factory=list)
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
