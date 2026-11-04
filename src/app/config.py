from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    nvidia_api_key: str = ""
    primary_model: str = "nvidia/nemotron-3-ultra-550b-a55b"
    fallback_model: str = "nvidia/nemotron-3.5-super-vl-120b-a12b"

    langsmith_tracing: bool = True
    langsmith_api_key: str = ""
    langsmith_agent_id: str = "learning-rag"
    langsmith_agent_environment: str = "local"
    langsmith_endpoint: str = "https://aws.api.smith.langchain.com"

    app_env: str = "development"
    log_level: str = "INFO"
    rate_limit: str = "20/minnute"
    cache_ttl_seconds: int = 300
    max_retries: int = 3

    # MinIO (object storage)
    minio_host: str = "localhost"
    minio_port: int = 9000
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "uploads"
    minio_secure: bool = False

    # DB
    postgres_db: str = "db"
    postgres_user: str = "user"
    postgres_password: str = "pass"

    db_host: str = "localhost"
    db_port: int = 5432

    # Redis (queue)
    redis_host: str = "localhost"
    redis_port: int = 6379
    upload_queue_name: str = "file_processing_queue"

    @property
    def minio_endpoint(self) -> str:
        return f"{self.minio_host}:{self.minio_port}"

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
