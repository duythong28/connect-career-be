import hashlib
import json
import logging
from typing import Optional, Tuple, List
import redis
from .embedding_cache import get_cache

logger = logging.getLogger(__name__)


class RecommendationCache:
    """Redis-based cache for recommendation results, reusing EmbeddingCache connection pool"""
    
    def __init__(self, ttl_seconds: int = 300, key_prefix: str = "rec:"):
        """
        Initialize recommendation cache using existing Redis connection
        
        Args:
            ttl_seconds: TTL for cached recommendations (default: 300 = 5 minutes)
            key_prefix: Prefix for cache keys
        """
        self.ttl_seconds = ttl_seconds
        self.key_prefix = key_prefix
        
        # Reuse connection pool from EmbeddingCache
        embedding_cache = get_cache()
        if embedding_cache and hasattr(embedding_cache, 'redis_client'):
            self.redis_client = embedding_cache.redis_client
            self.enabled = True
            logger.info(f"Recommendation cache initialized using shared Redis connection, TTL: {self.ttl_seconds}s")
        else:
            self.enabled = False
            self.redis_client = None
            logger.warning("Recommendation cache disabled: EmbeddingCache not available")
    
    def _make_cache_key(self, user_id: str, request_hash: str) -> str:
        """Create cache key from user ID and request hash"""
        return f"{self.key_prefix}{user_id}:{request_hash}"
    
    def _hash_request(self, request_dict: dict) -> str:
        """Create hash from request parameters"""
        sorted_dict = json.dumps(request_dict, sort_keys=True)
        return hashlib.md5(sorted_dict.encode('utf-8')).hexdigest()[:16]
    
    def get(
        self, 
        user_id: str, 
        request_dict: dict
    ) -> Optional[Tuple[List[str], List[float]]]:
        """Get cached recommendations"""
        if not self.enabled or not self.redis_client:
            return None
        
        try:
            request_hash = self._hash_request(request_dict)
            key = self._make_cache_key(user_id, request_hash)
            
            # Use get with decode_responses=False since we're sharing connection
            # But we need to decode manually for JSON
            cached_data = self.redis_client.get(key)
            if cached_data is None:
                return None
            
            # Decode bytes to string if needed
            if isinstance(cached_data, bytes):
                cached_data = cached_data.decode('utf-8')
            
            data = json.loads(cached_data)
            job_ids = data.get('jobIds', [])
            scores = data.get('scores', [])
            
            logger.debug(f"Cache hit for user {user_id}")
            return (job_ids, scores)
            
        except redis.RedisError as e:
            logger.warning(f"Redis error getting recommendation cache: {e}")
            return None
        except Exception as e:
            logger.error(f"Error deserializing cached recommendations: {e}")
            return None
    
    def set(
        self,
        user_id: str,
        request_dict: dict,
        job_ids: List[str],
        scores: List[float],
        ttl: Optional[int] = None
    ) -> bool:
        """Cache recommendation results"""
        if not self.enabled or not self.redis_client:
            logger.warning(f"Cache not enabled or Redis client not available. enabled={self.enabled}, redis_client={self.redis_client is not None}")
            return False

        
        try:
            request_hash = self._hash_request(request_dict)
            key = self._make_cache_key(user_id, request_hash)
            
            data = {
                'jobIds': job_ids,
                'scores': scores
            }
            
            ttl_to_use = ttl if ttl is not None else self.ttl_seconds
            # Encode to bytes since shared connection uses decode_responses=False
            json_data = json.dumps(data).encode('utf-8')
            
            self.redis_client.setex(key, ttl_to_use, json_data)
            
            logger.debug(f"Cached recommendations for user {user_id} (TTL: {ttl_to_use}s)")
            return True
            
        except redis.RedisError as e:
            logger.warning(f"Redis error setting recommendation cache: {e}")
            return False
        except Exception as e:
            logger.error(f"Error serializing recommendations for cache: {e}")
            return False
    
    def delete(self, user_id: str, request_dict: dict = None) -> bool:
        """Delete cached recommendations for a user"""
        if not self.enabled or not self.redis_client:
            return False
        
        try:
            if request_dict:
                request_hash = self._hash_request(request_dict)
                key = self._make_cache_key(user_id, request_hash)
                return bool(self.redis_client.delete(key))
            else:
                pattern = f"{self.key_prefix}{user_id}:*"
                keys = list(self.redis_client.scan_iter(match=pattern))
                if keys:
                    return bool(self.redis_client.delete(*keys))
                return True
        except redis.RedisError as e:
            logger.warning(f"Redis error deleting recommendation cache: {e}")
            return False
    
    def clear_all(self) -> int:
        """Clear all recommendation cache"""
        if not self.enabled or not self.redis_client:
            return 0
        
        try:
            pattern = f"{self.key_prefix}*"
            keys = list(self.redis_client.scan_iter(match=pattern))
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except redis.RedisError as e:
            logger.warning(f"Redis error clearing recommendation cache: {e}")
            return 0
    def get_similar_jobs(
        self,
        job_id: str,
        request_dict: dict
    ) -> Optional[Tuple[List[str], List[float]]]:
        """Get cached similar jobs"""
        if not self.enabled or not self.redis_client:
            return None
        
        try:
            request_hash = self._hash_request(request_dict)
            key = f"{self.key_prefix}similar:{job_id}:{request_hash}"
            
            cached_data = self.redis_client.get(key)
            if cached_data is None:
                return None
            
            if isinstance(cached_data, bytes):
                cached_data = cached_data.decode('utf-8')
            
            data = json.loads(cached_data)
            job_ids = data.get('jobIds', [])
            scores = data.get('scores', [])
            
            logger.debug(f"Cache hit for similar jobs to job {job_id}")
            return (job_ids, scores)
            
        except redis.RedisError as e:
            logger.warning(f"Redis error getting similar jobs cache: {e}")
            return None
        except Exception as e:
            logger.error(f"Error deserializing cached similar jobs: {e}")
            return None

    def set_similar_jobs(
        self,
        job_id: str,
        request_dict: dict,
        job_ids: List[str],
        scores: List[float],
        ttl: Optional[int] = None
    ) -> bool:
        """Cache similar jobs results"""
        if not self.enabled or not self.redis_client:
            return False
        
        try:
            request_hash = self._hash_request(request_dict)
            key = f"{self.key_prefix}similar:{job_id}:{request_hash}"
            
            data = {
                'jobIds': job_ids,
                'scores': scores
            }
            
            ttl_to_use = ttl if ttl is not None else self.ttl_seconds
            json_data = json.dumps(data).encode('utf-8')
            
            self.redis_client.setex(key, ttl_to_use, json_data)
            
            logger.debug(f"Cached similar jobs for job {job_id} (TTL: {ttl_to_use}s)")
            return True
            
        except redis.RedisError as e:
            logger.warning(f"Redis error setting similar jobs cache: {e}")
            return False
        except Exception as e:
            logger.error(f"Error serializing similar jobs for cache: {e}")
            return False

_recommendation_cache: Optional[RecommendationCache] = None


def get_recommendation_cache() -> Optional[RecommendationCache]:
    """Get or create recommendation cache instance (reusing Redis connection)"""
    global _recommendation_cache
    
    if _recommendation_cache is None:
        _recommendation_cache = RecommendationCache(ttl_seconds=300)  # 5 minutes
    
    return _recommendation_cache if _recommendation_cache.enabled else None