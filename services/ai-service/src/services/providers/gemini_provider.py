import numpy as np
from typing import List
import logging
from google import genai
from google.genai import types
from .base_embedding_provider import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class GoogleProvider(BaseEmbeddingProvider):
    """Provider using Google Generative AI (Gemini) embeddings"""
    
    def __init__(self, api_key: str, model: str = "text-embedding-004"):
        self.client = genai.Client(api_key=api_key)
        self.model = model
        # Dimension mapping for Google models
        dimension_map = {
            "text-embedding-004": 768,
            "textembedding-gecko@001": 768,
            "textembedding-gecko@002": 768,
            "textembedding-gecko@003": 768,
        }
        self._dimension = dimension_map.get(model, 768)
        logger.info(f"Initialized Google provider with model: {model}, dimension: {self._dimension}")
    
    @property
    def dimension(self) -> int:
        return self._dimension
    
    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """Encode texts using Google Generative AI API"""
        if not texts:
            return np.array([])
        
        # Filter out empty texts
        non_empty_texts = [t if t and t.strip() else " " for t in texts]
        
        try:
            embeddings = []
            # Google API may have batch limits, process in chunks
            batch_size = 100
            for i in range(0, len(non_empty_texts), batch_size):
                batch = non_empty_texts[i:i + batch_size]
                
                # Use the embedding model
                response = self.client.models.embed_content(
                    model=self.model,
                    contents=batch,
                )
                
                # Extract embeddings from response
                # Note: Response structure may vary, adjust based on actual API
                if hasattr(response, 'embeddings'):
                    batch_embeddings = [emb.values for emb in response.embeddings]
                elif isinstance(response, list):
                    batch_embeddings = [item for item in response]
                else:
                    # Fallback: try to get values directly
                    batch_embeddings = response if isinstance(response, list) else [response]
                
                embeddings.extend(batch_embeddings)
            
            embeddings = np.array(embeddings)
            
            if normalize:
                # Normalize to unit vectors
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms = np.where(norms == 0, 1, norms)
                embeddings = embeddings / norms
            
            return embeddings
        except Exception as e:
            logger.error(f"Google embedding error: {e}")
            raise