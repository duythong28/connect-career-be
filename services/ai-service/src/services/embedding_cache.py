import hashlib
import json
import logging
import numpy as np
import pickle
from typing import Optional, Dict
from threading import Lock
import redis
from redis.connection import ConnectionPool
from ..config import settings

logger = logging.getLogger(__name__)


class EmbeddingCache:
    """Redis-based embeddings with efficient numpy array storage"""
    
    def __init__(
        self, 
        host: str = None,
        port: int = None,
        password: str = None,
        db: int = None,
        ttl_seconds: int = None,
        key_prefix: str = None,
        connection_pool: ConnectionPool = None,
    ): 
        """
        Initialize Redis cache for embeddings

        Args:
            host: Redis host
            port: Redis port
            password: Redis password
            db: Redis database number
            ttl_seconds: Default TTL for cached items
            key_prefix: Prefix for cache keys
            connection_pool: Optional connection pool for Redis
        """
        
        self.host = host or settings.redis_host
        self.port = port or settings.redis_port
        self.password = password or settings.redis_password
        self.db = int(db) if db is not None else int(settings.redis_db)
        self.ttl_seconds = ttl_seconds or settings.embedding_cache_ttl
        self.key_prefix = key_prefix or settings.embedding_cache_prefix

        
        if connection_pool:
            self.redis_client = redis.Redis(connection_pool=connection_pool)
        else: 
            self.connection_pool = ConnectionPool(
                host=self.host,
                port=self.port,
                password=self.password,
                db=self.db,  # Now it's an integer
                decode_responses=False,  # Keep binary for numpy arrays
                max_connections=3,  # Reduced from 50 to 3 - Redis Cloud has limited connections
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
            )
            self.redis_client = redis.Redis(connection_pool=self.connection_pool)
        
        try: 
            self.redis_client.ping()
            logger.info(
                f"Redis cache initialized: {self.host}:{self.port}/{self.db}, "
                f"TTL: {self.ttl_seconds}s, Prefix: {self.key_prefix}"
            )
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    def _hash_text(self, text: str) -> str:
        """Generate a hash for a text string"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def _make_key(self, text_hash: str) -> str: 
        """Create a cache key from text hash and prefix"""
        # Remove trailing colon from prefix if present, then add it
        prefix = self.key_prefix.rstrip(':')
        return f"{prefix}:{text_hash}"
    
    def get(self, text: str) -> Optional[np.ndarray]:
        """
        Get cached embedding if available
        Args:
            text: Text to get embedding for
        Returns:
            Embedding if available, None otherwise
        """
        try:
            key = self._make_key(self._hash_text(text))
            cached_data = self.redis_client.get(key)
            
            if cached_data is None:
                return None
            
            embedding = pickle.loads(cached_data)
            if not isinstance(embedding, np.ndarray):
                logger.warning(f"Invalid cached data type for key: {key[:16]}...")
                return None
            
            logger.debug(f"Cache hit for text hash: {key[len(self.key_prefix):16]}...")
            return embedding.astype(np.float32)
            
        except redis.RedisError as e:
            logger.warning(f"Redis error getting cache: {e}")
            return None
        except Exception as e:
            logger.error(f"Error deserializing cached embedding: {e}")
            return None
    
    def set(self, text: str, embedding: np.ndarray, ttl: Optional[int] = None) -> bool:
        """
        Cache an embedding for a text
        Args:
            text: Text to cache embedding for
            embedding: Numpy array embedding
            ttl: Optional TTL for cache item
        Returns:
            True if successful, False otherwise
        """
        try:
            key = self._make_key(self._hash_text(text))
            
            # Serialize numpy array
            # Using pickle for numpy arrays (more efficient than JSON)
            serialized = pickle.dumps(embedding.astype(np.float32), protocol=pickle.HIGHEST_PROTOCOL)
            
            # Store with TTL
            ttl_to_use = ttl if ttl is not None else self.ttl_seconds
            self.redis_client.setex(key, ttl_to_use, serialized)
            
            logger.debug(f"Cached embedding for text hash: {key[len(self.key_prefix):16]}...")
            return True
        except redis.RedisError as e:
            logger.warning(f"Redis error setting cache: {e}")
            return False
        except Exception as e:
            logger.error(f"Error serializing embedding for cache: {e}")
            return False

    def get_many(self, texts: list) -> Dict[str, np.ndarray]:
        """
        Get multiple cached embeddings efficiently using pipeline
        
        Args:
            texts: List of texts to look up
            
        Returns:
            Dictionary mapping text -> embedding for cache hits
        """
        if not texts:
            return {}
        
        try:
            # Create keys for all texts
            text_hashes = {self._hash_text(text): text for text in texts}
            keys = [self._make_key(hash_val) for hash_val in text_hashes.keys()]
            
            # Use pipeline for batch get
            pipe = self.redis_client.pipeline()
            for key in keys:
                pipe.get(key)
            results = pipe.execute()
            
            # Deserialize results
            cached = {}
            for key, result in zip(keys, results):
                if result is not None:
                    try:
                        embedding = pickle.loads(result)
                        if isinstance(embedding, np.ndarray):
                            # Extract hash from key (remove prefix)
                            prefix_len = len(self.key_prefix.rstrip(':')) + 1  # +1 for colon
                            hash_val = key[prefix_len:]
                            text = text_hashes[hash_val]
                            cached[text] = embedding.astype(np.float32)
                    except Exception as e:
                        logger.warning(f"Error deserializing cached embedding: {e}")
                        continue
            
            logger.debug(f"Cache batch get: {len(cached)}/{len(texts)} hits")
            return cached
            
        except redis.RedisError as e:
            logger.warning(f"Redis error in batch get: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error in batch cache get: {e}")
            return {}
        
    def set_many(self, text_embedding_pairs: Dict[str, np.ndarray], ttl: Optional[int] = None) -> int:
        """
        Cache multiple embeddings efficiently using pipeline
        
        Args:
            text_embedding_pairs: Dictionary mapping text -> embedding
            ttl: Optional TTL override (in seconds)
            
        Returns:
            Number of successfully cached items
        """
        if not text_embedding_pairs:
            return 0
        
        try:
            ttl_to_use = ttl if ttl is not None else self.ttl_seconds
            
            # Use pipeline for batch set
            pipe = self.redis_client.pipeline()
            for text, embedding in text_embedding_pairs.items():
                key = self._make_key(self._hash_text(text))
                serialized = pickle.dumps(embedding.astype(np.float32), protocol=pickle.HIGHEST_PROTOCOL)
                pipe.setex(key, ttl_to_use, serialized)
            
            results = pipe.execute()
            success_count = sum(1 for r in results if r)
            
            logger.debug(f"Cached {success_count}/{len(text_embedding_pairs)} embeddings")
            return success_count
            
        except redis.RedisError as e:
            logger.warning(f"Redis error in batch set: {e}")
            return 0
        except Exception as e:
            logger.error(f"Error in batch cache set: {e}")
            return 0
    
    def delete(self, text: str) -> bool:
        """Delete cached embedding"""
        try:
            key = self._make_key(self._hash_text(text))
            return bool(self.redis_client.delete(key))
        except redis.RedisError as e:
            logger.warning(f"Redis error deleting cache: {e}")
            return False
    
    def clear_pattern(self, pattern: str = None) -> int:
        """
        Clear cache entries matching pattern
        
        Args:
            pattern: Redis pattern (default: all embeddings)
            
        Returns:
            Number of keys deleted
        """
        try:
            if pattern is None:
                pattern = f"{self.key_prefix.rstrip(':')}*"
            
            keys = list(self.redis_client.scan_iter(match=pattern))
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except redis.RedisError as e:
            logger.warning(f"Redis error clearing cache: {e}")
            return 0

    def stats(self) -> Dict:
        """Get cache statistics"""
        try:
            pattern = f"{self.key_prefix.rstrip(':')}*"
            keys = list(self.redis_client.scan_iter(match=pattern))
            
            # Get memory usage (if available)
            info = self.redis_client.info('memory')
            memory_used = info.get('used_memory_human', 'N/A')
            
            return {
                'total_keys': len(keys),
                'memory_used': memory_used,
                'ttl_seconds': self.ttl_seconds,
                'key_prefix': self.key_prefix,
            }
        except redis.RedisError as e:
            logger.warning(f"Redis error getting stats: {e}")
            return {'error': str(e)}
        
    def health_check(self) -> bool:
        """Check if Redis is accessible"""
        try:
            return self.redis_client.ping()
        except:
            return False


# Global cache instance with thread-safe initialization
_embedding_cache: Optional[EmbeddingCache] = None
_cache_lock = Lock()


def get_cache() -> Optional[EmbeddingCache]:
    """Return a lazily-initialized global EmbeddingCache.
    
    - Creates instance on first call only
    - Thread-safe using lock
    - Retries creation on later calls if previous creation failed
    - Disabled cleanly via config
    """
    global _embedding_cache
    
    # TEMPORARY: Force disable cache until Redis connections are cleared
    return None  # Add this line temporarily
    
    if not settings.embedding_cache_enabled:
        return None

    if _embedding_cache is not None:
        return _embedding_cache

    # First-time initialization with double-check locking
    with _cache_lock:
        # Double-check inside the lock
        if _embedding_cache is not None:
            return _embedding_cache

        try:
            instance = EmbeddingCache()
        except Exception as e:
            logger.error(f"Redis cache init failed: {e}")
            logger.warning("Running without cache")
            return None

        _embedding_cache = instance
        return _embedding_cache