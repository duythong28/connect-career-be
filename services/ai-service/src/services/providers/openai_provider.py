import numpy as np
from typing import List
import logging
from openai import OpenAI
from .base_embedding_provider import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseEmbeddingProvider):
    """Provider using OpenAI embeddings API"""
    
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        # Dimension mapping for OpenAI models
        dimension_map = {
            "text-embedding-ada-002": 1536,
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
        }
        self._dimension = dimension_map.get(model, 1536)
        logger.info(f"Initialized OpenAI provider with model: {model}, dimension: {self._dimension}")
    
    @property
    def dimension(self) -> int:
        return self._dimension
    
    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """Encode texts using OpenAI API"""
        if not texts:
            return np.array([])
        
        # Filter out empty texts
        non_empty_texts = [t if t and t.strip() else " " for t in texts]
        
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=non_empty_texts,
            )
            
            embeddings = np.array([item.embedding for item in response.data])
            
            if normalize:
                # Normalize to unit vectors
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms = np.where(norms == 0, 1, norms)  # Avoid division by zero
                embeddings = embeddings / norms
            
            return embeddings
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise