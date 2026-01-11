import logging
import time
import threading
from typing import List, Optional

import numpy as np
from google.api_core import exceptions
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel

from .base_embedding_provider import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple token bucket rate limiter"""

    def __init__(self, max_requests: int, time_window: float):
        self.max_requests = max_requests
        self.time_window = time_window
        self.tokens = max_requests
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def acquire(self) -> bool:
        """Try to acquire a token. Returns True if successful, False if rate limited."""
        with self.lock:
            now = time.time()
            # Refill tokens based on elapsed time
            elapsed = now - self.last_refill
            tokens_to_add = int(elapsed / self.time_window * self.max_requests)
            if tokens_to_add > 0:
                self.tokens = min(self.max_requests, self.tokens + tokens_to_add)
                self.last_refill = now

            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False

    def wait_time(self) -> float:
        """Calculate how long to wait before next token is available"""
        with self.lock:
            if self.tokens >= 1:
                return 0.0
            elapsed = time.time() - self.last_refill
            return max(0.0, self.time_window - elapsed)


class GoogleVertexProvider(BaseEmbeddingProvider):
    """Provider using Google Vertex AI embeddings with rate limiting and fallback"""

    DEFAULT_RPS = 0.5 
    DEFAULT_BATCH_SIZE = 3  

    def __init__(
        self,
        project_id: str,
        location: str = "us-central1",
        model: str = "gemini-embedding-001",
        requests_per_second: Optional[float] = None,
        fallback_provider: Optional[BaseEmbeddingProvider] = None,
    ):
        self.project_id = project_id
        self.location = location
        self.model_name = model
        self.fallback_provider = fallback_provider

        # Initialize rate limiter
        rps = requests_per_second or self.DEFAULT_RPS
        self.rate_limiter = RateLimiter(max_requests=int(rps * 60), time_window=60.0)

        # Initialize Vertex AI
        try:
            aiplatform.init(project=project_id, location=location)
            self.model = TextEmbeddingModel.from_pretrained(model)

            # Get dimension from model (with retry)
            test_embedding = self._get_embeddings_with_retry(["test"])[0].values
            self._dimension = len(test_embedding)
            logger.info(
                f"Initialized Google Vertex AI provider. Dimension: {self._dimension}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI: {e}")
            if fallback_provider:
                logger.warning("Using fallback provider for dimension")
                self._dimension = fallback_provider.dimension
            else:
                raise

    @property
    def dimension(self) -> int:
        return self._dimension

    def _get_embeddings_with_retry(
        self,
        texts: List[str],
        max_retries: int = 3,
        initial_delay: float = 1.0,
    ):
        """Get embeddings with exponential backoff retry for quota errors"""
        delay = initial_delay

        for attempt in range(max_retries):
            try:
                # Rate limiting
                if not self.rate_limiter.acquire():
                    wait_time = self.rate_limiter.wait_time()
                    if wait_time > 0:
                        logger.warning(f"Rate limited. Waiting {wait_time:.2f}s...")
                        time.sleep(wait_time)
                        if not self.rate_limiter.acquire():
                            raise Exception("Rate limit exceeded")

                # Call Vertex AI
                return self.model.get_embeddings(texts)

            except exceptions.ResourceExhausted as e:
                # 429 / quota exceeded
                if attempt < max_retries - 1:
                    logger.warning(
                        f"Quota exceeded (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)
                    delay *= 2
                else:
                    logger.error(f"Quota exceeded after {max_retries} attempts: {e}")
                    raise
            except Exception as e:
                # Other transient errors
                if attempt < max_retries - 1:
                    logger.warning(
                        f"Error (attempt {attempt + 1}/{max_retries}): {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)
                    delay *= 2
                else:
                    raise

    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """Encode texts using Vertex AI with rate limiting and fallback"""
        if not texts:
            return np.array([])

        # Filter out empty texts
        non_empty_texts = [t if t and t.strip() else " " for t in texts]

        try:
            # Process in smaller batches to avoid quota issues
            batch_size = self.DEFAULT_BATCH_SIZE
            all_embeddings = []

            for i in range(0, len(non_empty_texts), batch_size):
                batch = non_empty_texts[i : i + batch_size]

                try:
                    # Get embeddings with retry logic
                    embeddings_list = self._get_embeddings_with_retry(batch)
                    batch_embeddings = np.array(
                        [emb.values for emb in embeddings_list], dtype=np.float32
                    )
                    all_embeddings.append(batch_embeddings)

                    # Small delay between batches to spread load
                    if i + batch_size < len(non_empty_texts):
                        time.sleep(max(0.0, 1.0 / self.rate_limiter.max_requests * 60))

                except exceptions.ResourceExhausted as e:
                    # Quota exceeded - use fallback if available
                    if self.fallback_provider:
                        logger.warning(
                            "Vertex AI quota exceeded for batch. "
                            f"Using fallback provider for {len(batch)} texts"
                        )
                        fallback_embeddings = self.fallback_provider.encode(
                            batch, normalize
                        )
                        all_embeddings.append(fallback_embeddings)
                    else:
                        logger.error(
                            f"Quota exceeded and no fallback available: {e}"
                        )
                        raise
                except Exception as e:
                    logger.error(f"Error encoding batch: {e}")
                    if self.fallback_provider:
                        logger.warning("Using fallback provider due to error")
                        fallback_embeddings = self.fallback_provider.encode(
                            batch, normalize
                        )
                        all_embeddings.append(fallback_embeddings)
                    else:
                        raise

            embeddings = (
                np.vstack(all_embeddings) if all_embeddings else np.array([])
            )

            if normalize and len(embeddings) > 0:
                # Normalize to unit vectors
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms = np.where(norms == 0, 1, norms)
                embeddings = embeddings / norms

            return embeddings

        except Exception as e:
            logger.error(f"Google Vertex AI embedding error: {e}")
            # Final fallback attempt
            if self.fallback_provider:
                logger.warning("Using fallback provider for entire batch")
                return self.fallback_provider.encode(non_empty_texts, normalize)
            raise