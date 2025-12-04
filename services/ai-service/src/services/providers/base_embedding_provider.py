from abc import ABC, abstractmethod
from typing import List
import numpy as np

class BaseEmbeddingProvider(ABC):
    """Abstract base class for embedding providers"""
    
    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the dimension of embeddings produced by this provider"""
        pass
    
    @abstractmethod
    def encode(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """
        Encode a list of texts into embeddings
        Args:
            texts: List[str] - The texts to encode
            normalize: Whether to normalize the embeddings
        Returns:
            numpy array of shape (len(texts), dimension)
        """
        pass
    
    def encode_single(self, text: str, normalize: bool = True) -> np.ndarray:
        """
        Encode a single text into an embedding
        Args:
            text: str - The text to encode
            normalize: Whether to normalize the embedding
        Returns:
            numpy array of shape (dimension,)
        """
        return self.encode([text], normalize=normalize)[0]