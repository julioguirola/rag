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

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
