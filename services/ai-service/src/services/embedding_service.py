import numpy as np
import logging
from typing import List, Optional
import json
from ..config import settings
from ..database import db
from .providers.factory import EmbeddingProviderFactory
from .providers.base_embedding_provider import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        logger.info(f"Initializing EmbeddingService with provider: {settings.embedding_provider}")
        self.provider: BaseEmbeddingProvider = EmbeddingProviderFactory.create_provider()
        self.dim = self.provider.dimension
        logger.info(f"EmbeddingService initialized. Dimension: {self.dim}")
    
    def encode_text(self, text: str) -> np.ndarray:
        """Encode text to embedding vector"""
        if not text or not text.strip():
            return np.zeros(self.dim, dtype=np.float32)
        return self.provider.encode_single(text, normalize=True)
    
    def encode_texts(self, texts: List[str]) -> np.ndarray:
        """Encode multiple texts to embeddings"""
        if not texts:
            return np.array([])
        return self.provider.encode(texts, normalize=True)
    
    def encode_job(self, title: str, description: str, location: str, requirements: List[str] = None) -> np.ndarray:
        """Encode job content into embedding"""
        parts = [title or "", description or "", location or ""]
        if requirements:
            parts.extend(requirements)
        text = "\n".join(filter(None, parts))
        return self.encode_text(text)
    
    def get_job_embedding(self, job_id: str) -> Optional[np.ndarray]:
        """Get job embedding from database"""
        try:
            query = """
                SELECT embedding
                FROM job_content_embeddings
                WHERE "jobId" = %s
            """
            results = db.execute_query(query, (job_id,))
            if results and results[0]['embedding']:
                emb_data = results[0]['embedding']
                # Handle both JSONB and array formats
                if isinstance(emb_data, list):
                    emb_list = emb_data
                elif isinstance(emb_data, str):
                    emb_list = json.loads(emb_data)
                else:
                    emb_list = emb_data
                return np.array(emb_list, dtype=np.float32)
            return None
        except Exception as e:
            logger.error(f"Error getting job embedding for {job_id}: {e}")
            return None
    
    def get_user_embedding(self, user_id: str) -> Optional[np.ndarray]:
        """Get user embedding from database"""
        try:
            query = """
                SELECT embedding
                FROM user_content_embeddings
                WHERE "userId" = %s
            """
            results = db.execute_query(query, (user_id,))
            if results and results[0]['embedding']:
                emb_data = results[0]['embedding']
                if isinstance(emb_data, list):
                    emb_list = emb_data
                elif isinstance(emb_data, str):
                    emb_list = json.loads(emb_data)
                else:
                    emb_list = emb_data
                return np.array(emb_list, dtype=np.float32)
            return None
        except Exception as e:
            logger.error(f"Error getting user embedding for {user_id}: {e}")
            return None
    
    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors"""
        if vec1 is None or vec2 is None:
            return 0.0
        try:
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return float(dot_product / (norm1 * norm2))
        except Exception as e:
            logger.error(f"Error computing cosine similarity: {e}")
            return 0.0

embedding_service = EmbeddingService()