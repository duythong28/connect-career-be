import logging
from typing import Optional
from .base_embedding_provider import BaseEmbeddingProvider
from ...config import settings

logger = logging.getLogger(__name__)


class EmbeddingProviderFactory:
    """Factory to create embedding providers with fallback support"""
    
    @staticmethod
    def create_provider(
        enable_fallback: bool = True,
        fallback_to_local: bool = True
    ) -> BaseEmbeddingProvider:
        """
        Create an embedding provider with optional fallback
        
        Args:
            enable_fallback: Enable fallback to local model on quota errors
            fallback_to_local: Use sentence-transformers as fallback
        """
        provider_type = settings.embedding_provider.lower()
        
        # Create fallback provider if enabled
        fallback_provider = None
        
        if provider_type == "sentence-transformers" or provider_type == "local":
            from .sentence_transformer_provider import SentenceTransformerProvider
            model_name = settings.embedding_model
            logger.info(f"Creating SentenceTransformer provider with model: {model_name}")
            return SentenceTransformerProvider(model_name=model_name)
        
        elif provider_type == "openai":
            from .openai_provider import OpenAIProvider
            api_key = settings.openai_api_key
            if not api_key:
                raise ValueError("OPENAI_API_KEY is required when using OpenAI provider")
            model = settings.openai_model or "text-embedding-3-small"
            logger.info(f"Creating OpenAI provider with model: {model}")
            return OpenAIProvider(api_key=api_key, model=model)
        
        elif provider_type == "google":
            from .gemini_provider import GoogleProvider
            api_key = settings.google_api_key
            if not api_key:
                raise ValueError("GOOGLE_API_KEY is required when using Google provider")
            model = settings.google_model or "text-embedding-004"
            logger.info(f"Creating Google provider with model: {model}")
            return GoogleProvider(api_key=api_key, model=model)
        
        elif provider_type == "google-vertex" or provider_type == "vertex":
            from .google_vertex_provider import GoogleVertexProvider
            project_id = settings.google_vertex_project_id
            if not project_id:
                raise ValueError("GOOGLE_VERTEX_PROJECT_ID is required when using Vertex AI")
            location = settings.google_vertex_location or "us-central1"
            model = settings.google_vertex_model or "textembedding-gecko@003"
            
            # Get rate limit from env (requests per second)
            import os
            rps = float(os.getenv("VERTEX_RPS", "1.5"))
            
            logger.info(
                f"Creating Google Vertex AI provider with model: {model}, "
                f"RPS: {rps}, Fallback: {fallback_provider is not None}"
            )
            return GoogleVertexProvider(
                project_id=project_id,
                location=location,
                model=model,
                requests_per_second=rps,
                fallback_provider=fallback_provider,
            )
        
        else:
            raise ValueError(
                f"Unknown embedding provider: {provider_type}. "
                f"Supported: sentence-transformers, openai, google, google-vertex"
            )