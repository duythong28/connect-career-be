import numpy as np
import logging
from typing import List, Optional
import json
from ..config import settings
from ..database import db
from .providers.factory import EmbeddingProviderFactory
from .providers.base_embedding_provider import BaseEmbeddingProvider
from .embedding_cache import get_cache

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, use_cache: bool = None):
        logger.info(f"Initializing EmbeddingService with provider: {settings.embedding_provider}")
        self.provider: BaseEmbeddingProvider = EmbeddingProviderFactory.create_provider(
            enable_fallback=False,      
            fallback_to_local=False     
        )
        self.dim = self.provider.dimension        
        # Use cache if enabled in settings
        use_cache = use_cache if use_cache is not None else settings.embedding_cache_enabled
        self.cache = get_cache() if use_cache else None
        
        if self.cache:
            logger.info(f"EmbeddingService initialized with Redis cache. Dimension: {self.dim}")
        else:
            logger.info(f"EmbeddingService initialized without cache. Dimension: {self.dim}")
    
    def encode_text(self, text: str) -> np.ndarray:
        """Encode text to embedding vector with Redis caching"""
        if not text or not text.strip():
            return np.zeros(self.dim, dtype=np.float32)
        
        # Check Redis cache first
        if self.cache:
            cached = self.cache.get(text)
            if cached is not None:
                return cached
        
        # Generate embedding
        embedding = self.provider.encode_single(text, normalize=True)
        
        # Cache it in Redis
        if self.cache:
            self.cache.set(text, embedding)
        
        return embedding
    
    def encode_texts(self, texts: List[str]) -> np.ndarray:
        """Encode multiple texts to embeddings with efficient Redis batch caching"""
        if not texts:
            return np.array([])
        
        # Check Redis cache for all texts at once
        if self.cache:
            cached_dict = self.cache.get_many(texts)
            
            # Separate cached and uncached texts
            texts_to_encode = [t for t in texts if t not in cached_dict]
            
            if not texts_to_encode:
                # All cached - return in original order
                return np.array([cached_dict[t] for t in texts])
            
            # Encode uncached texts
            new_embeddings = self.provider.encode(texts_to_encode, normalize=True)
            
            # Cache new embeddings in batch
            if self.cache and len(new_embeddings) > 0:
                new_cache_dict = {
                    text: emb for text, emb in zip(texts_to_encode, new_embeddings)
                }
                self.cache.set_many(new_cache_dict)
            
            # Combine cached and new embeddings
            all_embeddings = []
            for text in texts:
                if text in cached_dict:
                    all_embeddings.append(cached_dict[text])
                else:
                    idx = texts_to_encode.index(text)
                    all_embeddings.append(new_embeddings[idx])
            
            return np.array(all_embeddings)
        
        # No cache - encode all
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