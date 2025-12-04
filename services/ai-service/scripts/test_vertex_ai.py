"""
Quick test script for Google Vertex AI Embeddings
Run this to verify your Vertex AI setup is working correctly
"""
import sys
import os
import time
import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from src.services.embedding_service import EmbeddingService
    from src.config import settings
    import logging
except Exception as e:
    print(f"❌ Import error: {e}")
    print("\nMake sure you're running from the ai-service directory")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def print_header(text: str):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_result(name: str, success: bool, details: str = ""):
    status = "✅" if success else "❌"
    print(f"{status} {name}")
    if details:
        print(f"   {details}")


def main():
    print_header("Google Vertex AI Embedding Test")
    
    # Check configuration
    print("\n📋 Configuration Check:")
    print(f"   Provider: {settings.embedding_provider}")
    print(f"   Project ID: {settings.google_vertex_project_id}")
    print(f"   Location: {settings.google_vertex_location}")
    print(f"   Model: {settings.google_vertex_model}")
    
    # Check authentication
    print("\n🔐 Authentication Check:")
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        print_result(
            "Service account key found",
            os.path.exists(creds_path),
            f"Path: {creds_path}"
        )
    else:
        print_result(
            "Using default credentials",
            True,
            "Make sure you've run: gcloud auth application-default login"
        )
    
    # Test 1: Initialize service
    print_header("Test 1: Initialize Vertex AI Provider")
    try:
        service = EmbeddingService()
        print_result(
            "Service initialized",
            True,
            f"Dimension: {service.dim}, Provider: {type(service.provider).__name__}"
        )
    except Exception as e:
        print_result("Service initialization", False, f"Error: {str(e)}")
        print("\n❌ Failed to initialize. Check:")
        print("   1. GOOGLE_APPLICATION_CREDENTIALS is set correctly")
        print("   2. Vertex AI API is enabled in your GCP project")
        print("   3. Service account has Vertex AI User role")
        import traceback
        traceback.print_exc()
        return
    
    # Test 2: Encode single text
    print_header("Test 2: Encode Single Text")
    test_text = "Python developer with machine learning experience"
    try:
        start = time.time()
        embedding = service.encode_text(test_text)
        elapsed = (time.time() - start) * 1000
        
        is_valid = (
            embedding is not None and
            isinstance(embedding, np.ndarray) and
            len(embedding) == service.dim
        )
        
        norm = np.linalg.norm(embedding)
        print_result(
            f"Encode: '{test_text[:50]}...'",
            is_valid,
            f"Shape: {embedding.shape}, Norm: {norm:.4f}, Time: {elapsed:.2f}ms"
        )
    except Exception as e:
        print_result("Encode single text", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # Test 3: Encode multiple texts (batch)
    print_header("Test 3: Batch Encoding")
    test_texts = [
        "Python developer",
        "JavaScript engineer",
        "Machine learning specialist",
    ]
    try:
        start = time.time()
        embeddings = service.encode_texts(test_texts)
        elapsed = (time.time() - start) * 1000
        
        is_valid = (
            embeddings is not None and
            isinstance(embeddings, np.ndarray) and
            embeddings.shape == (len(test_texts), service.dim)
        )
        
        print_result(
            f"Batch encode {len(test_texts)} texts",
            is_valid,
            f"Shape: {embeddings.shape}, Time: {elapsed:.2f}ms ({elapsed/len(test_texts):.2f}ms per text)"
        )
    except Exception as e:
        print_result("Batch encoding", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # Test 4: Cosine similarity
    print_header("Test 4: Cosine Similarity")
    try:
        text1 = "Python developer"
        text2 = "Python programmer"
        text3 = "Chef"
        
        emb1 = service.encode_text(text1)
        emb2 = service.encode_text(text2)
        emb3 = service.encode_text(text3)
        
        sim_12 = service.cosine_similarity(emb1, emb2)
        sim_13 = service.cosine_similarity(emb1, emb3)
        
        print_result(
            f"Similarity: '{text1}' vs '{text2}'",
            True,
            f"Score: {sim_12:.4f} (should be high, >0.7)"
        )
        print_result(
            f"Similarity: '{text1}' vs '{text3}'",
            True,
            f"Score: {sim_13:.4f} (should be low, <0.3)"
        )
        
        if sim_12 > sim_13:
            print("\n✅ Similarity logic is working correctly!")
        else:
            print("\n⚠️  Similarity scores seem unexpected")
    except Exception as e:
        print_result("Cosine similarity", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # Summary
    print_header("✅ All Tests Passed!")
    print("\n🎉 Your Vertex AI embedding service is working correctly!")
    print("\nNext steps:")
    print("   1. Run training: python scripts/train_embeddings.py")
    print("   2. Start service: uvicorn src.main:app --reload")
    print("   3. Test API: curl http://localhost:8000/health")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()