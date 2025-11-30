import numpy as np
from typing import List
import logging
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel
from .base_embedding_provider import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class GoogleVertexProvider(BaseEmbeddingProvider):
    """Provider using Google Vertex AI embeddings"""
    
    def __init__(self, project_id: str, location: str = "us-central1", model: str = "textembedding-gecko@003"):
        self.project_id = project_id
        self.location = location
        self.model_name = model
        
        # Initialize Vertex AI
        aiplatform.init(project=project_id, location=location)
        self.model = TextEmbeddingModel.from_pretrained(model)
        
        # Get dimension from model
        test_embedding = self.model.get_embeddings(["test"])[0].values
        self._dimension = len(test_embedding)
        logger.info(f"Initialized Google Vertex AI provider. Dimension: {self._dimension}")
    
    @property
    def dimension(self) -> int:
        return self._dimension
    
    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """Encode texts using Vertex AI"""
        if not texts:
            return np.array([])
        
        # Filter out empty texts
        non_empty_texts = [t if t and t.strip() else " " for t in texts]
        
        try:
            # Vertex AI handles batching internally
            embeddings_list = self.model.get_embeddings(non_empty_texts)
            embeddings = np.array([emb.values for emb in embeddings_list])
            
            if normalize:
                # Normalize to unit vectors
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms = np.where(norms == 0, 1, norms)
                embeddings = embeddings / norms
            
            return embeddings
        except Exception as e:
            logger.error(f"Google Vertex AI embedding error: {e}")
            raise