import os
from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file from the project root (ai-service directory)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    # Database
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "connect_career")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "postgres")
    
    @property
    def db_dsn(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    # Embedding Provider Configuration
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "sentence-transformers")
    # Options: sentence-transformers, openai, google, google-vertex
    
    # SentenceTransformers (local) settings
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    embedding_dim: int = int(os.getenv("EMBEDDING_DIM", "384"))  # Will be auto-detected
    
    # OpenAI settings
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    openai_model: Optional[str] = os.getenv("OPENAI_MODEL", "text-embedding-3-small")
    
    # Google Generative AI settings
    google_api_key: Optional[str] = os.getenv("GOOGLE_API_KEY")
    google_model: Optional[str] = os.getenv("GOOGLE_MODEL", "text-embedding-004")
    
    # Google Vertex AI settings
    google_vertex_project_id: Optional[str] = os.getenv("GOOGLE_VERTEX_PROJECT_ID")
    google_vertex_location: Optional[str] = os.getenv("GOOGLE_VERTEX_LOCATION", "us-central1")
    google_vertex_model: Optional[str] = os.getenv("GOOGLE_VERTEX_MODEL", "textembedding-gecko@003")
    
    # CF model
    cf_factors_dim: int = int(os.getenv("CF_FACTORS_DIM", "64"))
    
    # Recommendation
    hybrid_alpha: float = float(os.getenv("HYBRID_ALPHA", "0.6"))
    default_limit: int = int(os.getenv("DEFAULT_LIMIT", "20"))
    
    # Service
    app_name: str = "Job Recommender Service"
    app_version: str = "0.1.0"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Added: Ignore extra fields from .env


settings = Settings()