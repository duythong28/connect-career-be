# scripts/debug_vertex.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

print("Step 1: Checking imports...")
try:
    from src.config import settings
    print(f"✅ Config loaded. Provider: {settings.embedding_provider}")
except Exception as e:
    print(f"❌ Config import failed: {e}")
    sys.exit(1)

print("\nStep 2: Checking Vertex AI config...")
print(f"   Project ID: {settings.google_vertex_project_id}")
print(f"   Location: {settings.google_vertex_location}")
print(f"   Model: {settings.google_vertex_model}")

print("\nStep 3: Checking authentication...")
creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if creds:
    print(f"   GOOGLE_APPLICATION_CREDENTIALS: {creds}")
    print(f"   File exists: {os.path.exists(creds)}")
else:
    print("   Using default credentials (gcloud)")

print("\nStep 4: Testing service initialization...")
try:
    from src.services.embedding_service import EmbeddingService
    service = EmbeddingService()
    print(f"✅ Service initialized! Dimension: {service.dim}")
except Exception as e:
    print(f"❌ Service init failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ All checks passed!")
