import numpy as np
from typing import List
import logging
from sentence_transformers import SentenceTransformer
from .base_embedding_provider import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class SentenceTransformerProvider(BaseEmbeddingProvider):
    """Provider using SentenceTransformers (local models)"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        logger.info(f"Loading SentenceTransformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
        # Get dimension from model
        test_embedding = self.model.encode("test", normalize_embeddings=True)
        self._dimension = len(test_embedding)
        logger.info(f"Model loaded. Dimension: {self._dimension}")
    
    @property
    def dimension(self) -> int:
        return self._dimension
    
    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """Encode texts using SentenceTransformers"""
        if not texts:
            return np.array([])
        
        # Filter out empty texts
        non_empty_texts = [t if t and t.strip() else " " for t in texts]
        
        embeddings = self.model.encode(
            non_empty_texts,
            normalize_embeddings=normalize,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return np.array(embeddings)