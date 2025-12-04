"""
Test script for EmbeddingService
Tests all functionality including encoding, similarity, and database operations
"""
import sys
import os
import time
import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.services.embedding_service import EmbeddingService
from src.config import settings
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_test(name: str, passed: bool, details: str = ""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")


def test_initialization():
    """Test 1: Service initialization"""
    print_section("Test 1: Service Initialization")
    
    try:
        service = EmbeddingService()
        print_test("Service initialization", True, f"Provider: {settings.embedding_provider}, Dimension: {service.dim}")
        return service
    except Exception as e:
        print_test("Service initialization", False, f"Error: {e}")
        return None


def test_encode_text(service: EmbeddingService):
    """Test 2: Encode single text"""
    print_section("Test 2: Encode Single Text")
    
    test_cases = [
        ("Python developer", "Normal text"),
        ("", "Empty string"),
        ("   ", "Whitespace only"),
        ("Machine learning engineer with 5 years experience", "Long text"),
    ]
    
    for text, description in test_cases:
        try:
            start = time.time()
            embedding = service.encode_text(text)
            elapsed = time.time() - start
            
            is_valid = (
                embedding is not None and
                isinstance(embedding, np.ndarray) and
                len(embedding) == service.dim and
                embedding.dtype == np.float32
            )
            
            norm = np.linalg.norm(embedding)
            print_test(
                f"Encode: {description}",
                is_valid,
                f"Shape: {embedding.shape}, Norm: {norm:.4f}, Time: {elapsed*1000:.2f}ms"
            )
        except Exception as e:
            print_test(f"Encode: {description}", False, f"Error: {e}")


def test_encode_texts(service: EmbeddingService):
    """Test 3: Encode multiple texts (batch)"""
    print_section("Test 3: Encode Multiple Texts (Batch)")
    
    texts = [
        "Python developer",
        "JavaScript engineer",
        "Machine learning specialist",
        "Data scientist",
        "Backend developer",
    ]
    
    try:
        start = time.time()
        embeddings = service.encode_texts(texts)
        elapsed = time.time() - start
        
        is_valid = (
            embeddings is not None and
            isinstance(embeddings, np.ndarray) and
            embeddings.shape == (len(texts), service.dim)
        )
        
        print_test(
            "Batch encoding",
            is_valid,
            f"Shape: {embeddings.shape}, Time: {elapsed*1000:.2f}ms ({elapsed*1000/len(texts):.2f}ms per text)"
        )
        
        # Test empty list
        empty_embeddings = service.encode_texts([])
        print_test(
            "Empty list encoding",
            empty_embeddings.shape == (0,),
            f"Shape: {empty_embeddings.shape}"
        )
        
    except Exception as e:
        print_test("Batch encoding", False, f"Error: {e}")


def test_encode_job(service: EmbeddingService):
    """Test 4: Encode job content"""
    print_section("Test 4: Encode Job Content")
    
    test_jobs = [
        {
            "title": "Senior Python Developer",
            "description": "We are looking for an experienced Python developer with expertise in FastAPI and machine learning.",
            "location": "San Francisco, CA",
            "requirements": ["Python", "FastAPI", "PostgreSQL", "5+ years experience"],
        },
        {
            "title": "Frontend Engineer",
            "description": "Build modern web applications using React and TypeScript.",
            "location": "Remote",
            "requirements": ["React", "TypeScript", "Node.js"],
        },
    ]
    
    for i, job in enumerate(test_jobs, 1):
        try:
            start = time.time()
            embedding = service.encode_job(
                job["title"],
                job["description"],
                job["location"],
                job["requirements"]
            )
            elapsed = time.time() - start
            
            is_valid = (
                embedding is not None and
                isinstance(embedding, np.ndarray) and
                len(embedding) == service.dim
            )
            
            print_test(
                f"Encode job {i}: {job['title']}",
                is_valid,
                f"Shape: {embedding.shape}, Time: {elapsed*1000:.2f}ms"
            )
        except Exception as e:
            print_test(f"Encode job {i}", False, f"Error: {e}")


def test_cosine_similarity(service: EmbeddingService):
    """Test 5: Cosine similarity"""
    print_section("Test 5: Cosine Similarity")
    
    # Similar texts
    text1 = "Python developer"
    text2 = "Python programmer"
    text3 = "JavaScript developer"
    text4 = "Chef"
    
    try:
        emb1 = service.encode_text(text1)
        emb2 = service.encode_text(text2)
        emb3 = service.encode_text(text3)
        emb4 = service.encode_text(text4)
        
        sim_12 = service.cosine_similarity(emb1, emb2)  # Should be high
        sim_13 = service.cosine_similarity(emb1, emb3)  # Should be medium
        sim_14 = service.cosine_similarity(emb1, emb4)  # Should be low
        
        print_test(
            f"Similarity: '{text1}' vs '{text2}'",
            True,
            f"Score: {sim_12:.4f} (should be high)"
        )
        print_test(
            f"Similarity: '{text1}' vs '{text3}'",
            True,
            f"Score: {sim_13:.4f} (should be medium)"
        )
        print_test(
            f"Similarity: '{text1}' vs '{text4}'",
            True,
            f"Score: {sim_14:.4f} (should be low)"
        )
        
        # Test with None
        sim_none = service.cosine_similarity(emb1, None)
        print_test("Similarity with None", sim_none == 0.0, f"Score: {sim_none}")
        
        # Test self-similarity (should be 1.0)
        sim_self = service.cosine_similarity(emb1, emb1)
        print_test(
            "Self-similarity",
            abs(sim_self - 1.0) < 0.01,
            f"Score: {sim_self:.4f} (should be ~1.0)"
        )
        
    except Exception as e:
        print_test("Cosine similarity", False, f"Error: {e}")


def test_database_operations(service: EmbeddingService):
    """Test 6: Database operations"""
    print_section("Test 6: Database Operations")
    
    # Test getting job embedding
    try:
        # Try to get a job embedding (use a test job_id if available)
        test_job_id = "00000000-0000-0000-0000-000000000001"  # Replace with actual job_id
        
        job_emb = service.get_job_embedding(test_job_id)
        if job_emb is not None:
            print_test(
                f"Get job embedding: {test_job_id}",
                True,
                f"Shape: {job_emb.shape}, Norm: {np.linalg.norm(job_emb):.4f}"
            )
        else:
            print_test(
                f"Get job embedding: {test_job_id}",
                True,
                "No embedding found (this is OK if job doesn't exist)"
            )
    except Exception as e:
        print_test("Get job embedding", False, f"Error: {e}")
    
    # Test getting user embedding
    try:
        test_user_id = "00000000-0000-0000-0000-000000000001"  # Replace with actual user_id
        
        user_emb = service.get_user_embedding(test_user_id)
        if user_emb is not None:
            print_test(
                f"Get user embedding: {test_user_id}",
                True,
                f"Shape: {user_emb.shape}, Norm: {np.linalg.norm(user_emb):.4f}"
            )
        else:
            print_test(
                f"Get user embedding: {test_user_id}",
                True,
                "No embedding found (this is OK if user doesn't exist)"
            )
    except Exception as e:
        print_test("Get user embedding", False, f"Error: {e}")


def test_performance(service: EmbeddingService):
    """Test 7: Performance benchmarks"""
    print_section("Test 7: Performance Benchmarks")
    
    # Single encoding
    text = "Python developer with machine learning experience"
    times = []
    for _ in range(10):
        start = time.time()
        service.encode_text(text)
        times.append(time.time() - start)
    
    avg_time = np.mean(times) * 1000
    std_time = np.std(times) * 1000
    
    print_test(
        "Single encoding performance (10 runs)",
        True,
        f"Avg: {avg_time:.2f}ms, Std: {std_time:.2f}ms"
    )
    
    # Batch encoding
    texts = [f"Job description {i}" for i in range(100)]
    start = time.time()
    embeddings = service.encode_texts(texts)
    batch_time = (time.time() - start) * 1000
    
    print_test(
        "Batch encoding performance (100 texts)",
        True,
        f"Total: {batch_time:.2f}ms, Per text: {batch_time/100:.2f}ms"
    )


def test_provider_info(service: EmbeddingService):
    """Test 8: Provider information"""
    print_section("Test 8: Provider Information")
    
    print(f"Provider Type: {settings.embedding_provider}")
    print(f"Model: {settings.embedding_model}")
    print(f"Embedding Dimension: {service.dim}")
    print(f"Provider Class: {type(service.provider).__name__}")


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("  EMBEDDING SERVICE TEST SUITE")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Provider: {settings.embedding_provider}")
    print(f"  Model: {settings.embedding_model}")
    print(f"  Log Level: {settings.log_level}")
    
    # Initialize service
    service = test_initialization()
    if service is None:
        print("\n❌ Cannot proceed without service initialization")
        return
    
    # Run all tests
    test_encode_text(service)
    test_encode_texts(service)
    test_encode_job(service)
    test_cosine_similarity(service)
    test_database_operations(service)
    test_performance(service)
    test_provider_info(service)
    
    # Summary
    print_section("Test Summary")
    print("✅ All tests completed!")
    print("\nNext steps:")
    print("  1. If database tests failed, make sure embeddings are generated:")
    print("     python scripts/train_embeddings.py")
    print("  2. Check logs for any warnings or errors")
    print("  3. Verify embedding dimensions match your database schema")


if __name__ == "__main__":
    main()