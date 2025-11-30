import logging
from typing import Optional
from .base_embedding_provider import BaseEmbeddingProvider
from ...config import settings

logger = logging.getLogger(__name__)


class EmbeddingProviderFactory:
    """Factory to create embedding providers based on configuration"""
    
    @staticmethod
    def create_provider() -> BaseEmbeddingProvider:
        """
        Create an embedding provider based on configuration
        
        Supported providers:
        - sentence-transformers (local)
        - openai
        - google (Generative AI)
        - google-vertex (Vertex AI)
        """
        provider_type = settings.embedding_provider.lower()
        
        if provider_type == "sentence-transformers" or provider_type == "local":
            # Lazy import - only import when needed
            from .sentence_transformer_provider import SentenceTransformerProvider
            model_name = settings.embedding_model
            logger.info(f"Creating SentenceTransformer provider with model: {model_name}")
            return SentenceTransformerProvider(model_name=model_name)
        
        elif provider_type == "openai":
            # Lazy import - only import when needed
            from .openai_provider import OpenAIProvider
            api_key = settings.openai_api_key
            if not api_key:
                raise ValueError("OPENAI_API_KEY is required when using OpenAI provider")
            model = settings.openai_model or "text-embedding-3-small"
            logger.info(f"Creating OpenAI provider with model: {model}")
            return OpenAIProvider(api_key=api_key, model=model)
        
        elif provider_type == "google":
            # Lazy import - only import when needed
            from .gemini_provider import GoogleProvider
            api_key = settings.google_api_key
            if not api_key:
                raise ValueError("GOOGLE_API_KEY is required when using Google provider")
            model = settings.google_model or "text-embedding-004"
            logger.info(f"Creating Google provider with model: {model}")
            return GoogleProvider(api_key=api_key, model=model)
        
        elif provider_type == "google-vertex" or provider_type == "vertex":
            # Lazy import - only import when needed
            from .google_vertex_provider import GoogleVertexProvider
            project_id = settings.google_vertex_project_id
            if not project_id:
                raise ValueError("GOOGLE_VERTEX_PROJECT_ID is required when using Vertex AI")
            location = settings.google_vertex_location or "us-central1"
            model = settings.google_vertex_model or "textembedding-gecko@003"
            logger.info(f"Creating Google Vertex AI provider with model: {model}")
            return GoogleVertexProvider(
                project_id=project_id,
                location=location,
                model=model,
            )
        
        else:
            raise ValueError(
                f"Unknown embedding provider: {provider_type}. "
                f"Supported: sentence-transformers, openai, google, google-vertex"
            )