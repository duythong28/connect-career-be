```bash
#!/bin/bash
# =============================================================================
# Connect Career - Complete Server Setup Script
# This script sets up everything needed to run dev services on your server
# =============================================================================

set -e  # Exit on error

# Configuration
DOCKER_HUB_USERNAME="lmtoan311"
CC_BE_TAG="dev-latest"
AI_SERVICE_TAG="dev-latest"
PROJECT_DIR="$HOME/connect-career-be/services"
CREDENTIALS_DIR="/opt/credentials"
CREDENTIALS_FILE="scientific-host-472000-u8-ac884452d866.json"

echo "=========================================="
echo "Connect Career - Server Setup"
echo "=========================================="

# Step 1: Check prerequisites
echo ""
echo "Step 1: Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "✗ Docker is not installed. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✓ Docker installed. Please logout and login again, then rerun this script."
    exit 0
fi
echo "✓ Docker is installed"

if ! command -v docker-compose &> /dev/null; then
    echo "✗ Docker Compose is not installed. Installing..."
    sudo apt update
    sudo apt install -y docker-compose
fi
echo "✓ Docker Compose is installed"

# Step 2: Create project structure
echo ""
echo "Step 2: Creating project structure..."
mkdir -p $PROJECT_DIR/api-gateway
mkdir -p $PROJECT_DIR/connect-career-be
mkdir -p $PROJECT_DIR/ai-service
cd $PROJECT_DIR
echo "✓ Project structure created at $PROJECT_DIR"

# Step 3: Create docker-compose.base.yml
echo ""
echo "Step 3: Creating docker-compose.base.yml..."
cat > docker-compose.base.yml << 'EOF'
version: "3.9"

services:
  kong:
    image: kong:3.8
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
      KONG_PROXY_LISTEN: "0.0.0.0:8000"
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
    volumes:
      - ./api-gateway/kong.yml:/kong/declarative/kong.yml:ro
    depends_on:
      - connect-career-be
      - ai-service

  connect-career-be:
    image: lmtoan311/connect-career-be:${CC_BE_TAG:-dev-latest}
    env_file:
      - ./connect-career-be/.env
    volumes:
      - ${GOOGLE_CREDENTIALS_PATH:-/opt/credentials/scientific-host-472000-u8-ac884452d866.json}:/app/credentials.json:ro
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

  ai-service:
    image: lmtoan311/ai-service:${AI_SERVICE_TAG:-dev-latest}
    env_file:
      - ./ai-service/.env
    volumes:
      - ${GOOGLE_CREDENTIALS_PATH:-/opt/credentials/scientific-host-472000-u8-ac884452d866.json}:/app/credentials.json:ro
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json
EOF
echo "✓ docker-compose.base.yml created"

# Step 4: Create docker-compose.dev.yml
echo ""
echo "Step 4: Creating docker-compose.dev.yml..."
cat > docker-compose.dev.yml << 'EOF'
version: "3.9"

services:
  kong:
    ports:
      - "8000:8000"
      - "8001:8001"

  connect-career-be:
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development

  ai-service:
    ports:
      - "8002:8000"
    environment:
      NODE_ENV: development
EOF
echo "✓ docker-compose.dev.yml created"

# Step 5: Create Kong configuration
echo ""
echo "Step 5: Creating Kong configuration..."
cat > api-gateway/kong.yml << 'EOF'
_format_version: "3.0"
_transform: true

services:
  - name: connect-career-be
    url: http://connect-career-be:8080
    routes:
      - name: connect-career-be-route
        paths:
          - /api
        strip_path: false

  - name: ai-service
    url: http://ai-service:8000
    routes:
      - name: ai-service-route
        paths:
          - /ai
        strip_path: true
EOF
echo "✓ Kong configuration created"

# Step 6: Create .env file templates
echo ""
echo "Step 6: Creating .env file templates..."

# connect-career-be/.env
cat > connect-career-be/.env << 'ENVEOF'
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=connect_career
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-database-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Add other environment variables as needed
ENVEOF
echo "✓ connect-career-be/.env template created"

# ai-service/.env
cat > ai-service/.env << 'ENVEOF'
# Embedding Provider Configuration
EMBEDDING_PROVIDER=sentence-transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=connect_career
DB_USER=postgres
DB_PASSWORD=your-database-password

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
EMBEDDING_CACHE_ENABLED=false

# Google Vertex AI (if using)
# GOOGLE_VERTEX_PROJECT_ID=your-project-id
# GOOGLE_VERTEX_LOCATION=us-central1
# GOOGLE_VERTEX_MODEL=textembedding-gecko@003

# Application
LOG_LEVEL=INFO
ENVEOF
echo "✓ ai-service/.env template created"

# Step 7: Setup Google credentials
echo ""
echo "Step 7: Setting up Google credentials..."
sudo mkdir -p $CREDENTIALS_DIR

if [ -f "$CREDENTIALS_DIR/$CREDENTIALS_FILE" ]; then
    echo "✓ Credentials file already exists at $CREDENTIALS_DIR/$CREDENTIALS_FILE"
else
    echo "⚠ Credentials file not found at $CREDENTIALS_DIR/$CREDENTIALS_FILE"
    echo "  Please upload your credentials file:"
    echo "  1. From your local machine, run:"
    echo "     scp /path/to/$CREDENTIALS_FILE user@server:/tmp/"
    echo "  2. Then on server, run:"
    echo "     sudo mv /tmp/$CREDENTIALS_FILE $CREDENTIALS_DIR/"
    echo "     sudo chmod 600 $CREDENTIALS_DIR/$CREDENTIALS_FILE"
    echo ""
    read -p "Press Enter to continue after uploading credentials, or Ctrl+C to exit..."
fi

if [ -f "$CREDENTIALS_DIR/$CREDENTIALS_FILE" ]; then
    sudo chmod 600 "$CREDENTIALS_DIR/$CREDENTIALS_FILE"
    sudo chown root:root "$CREDENTIALS_DIR/$CREDENTIALS_FILE"
    echo "✓ Credentials file permissions set"
fi

# Step 8: Set environment variables
echo ""
echo "Step 8: Setting environment variables..."
export DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME
export CC_BE_TAG=$CC_BE_TAG
export AI_SERVICE_TAG=$AI_SERVICE_TAG
export GOOGLE_CREDENTIALS_PATH=$CREDENTIALS_DIR/$CREDENTIALS_FILE

# Add to .bashrc for persistence
if ! grep -q "GOOGLE_CREDENTIALS_PATH" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# Connect Career Environment Variables" >> ~/.bashrc
    echo "export GOOGLE_CREDENTIALS_PATH=$CREDENTIALS_DIR/$CREDENTIALS_FILE" >> ~/.bashrc
    echo "export CC_BE_TAG=$CC_BE_TAG" >> ~/.bashrc
    echo "export AI_SERVICE_TAG=$AI_SERVICE_TAG" >> ~/.bashrc
    echo "✓ Environment variables added to ~/.bashrc"
fi

# Step 9: Login to Docker Hub
echo ""
echo "Step 9: Docker Hub login..."
echo "Please login to Docker Hub:"
docker login -u $DOCKER_HUB_USERNAME

# Step 10: Pull images
echo ""
echo "Step 10: Pulling Docker images..."
docker pull ${DOCKER_HUB_USERNAME}/connect-career-be:${CC_BE_TAG}
docker pull ${DOCKER_HUB_USERNAME}/ai-service:${AI_SERVICE_TAG}

# Tag images for local use
docker tag ${DOCKER_HUB_USERNAME}/connect-career-be:${CC_BE_TAG} connect-career-be:${CC_BE_TAG}
docker tag ${DOCKER_HUB_USERNAME}/ai-service:${AI_SERVICE_TAG} ai-service:${AI_SERVICE_TAG}
echo "✓ Images pulled and tagged"

# Step 11: Start services
echo ""
echo "Step 11: Starting services..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Step 12: Verify services
echo ""
echo "Step 12: Verifying services..."
echo ""
echo "Container status:"
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml ps

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Services are running on:"
echo "  - Kong Gateway:        http://localhost:8000"
echo "  - Kong Admin:          http://localhost:8001"
echo "  - Connect Career BE:   http://localhost:8080"
echo "  - AI Service:          http://localhost:8002"
echo ""
echo "Endpoints through Kong:"
echo "  - Backend API:         http://localhost:8000/api/*"
echo "  - AI Service:          http://localhost:8000/ai/*"
echo ""
echo "Useful commands:"
echo "  - View logs:           docker compose -f docker-compose.base.yml -f docker-compose.dev.yml logs -f"
echo "  - Stop services:       docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down"
echo "  - Restart services:    docker compose -f docker-compose.base.yml -f docker-compose.dev.yml restart"
echo "  - Update services:     docker compose -f docker-compose.base.yml -f docker-compose.dev.yml pull && docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d"
echo ""
echo "⚠ IMPORTANT: Update .env files with your actual configuration:"
echo "  - $PROJECT_DIR/connect-career-be/.env"
echo "  - $PROJECT_DIR/ai-service/.env"
echo ""
```

## How to use

1. Save the script on your server:

```bash
nano ~/setup-connect-career.sh
# Paste the entire script above
chmod +x ~/setup-connect-career.sh
```

2. Run it:

```bash
~/setup-connect-career.sh
```

3. Follow the prompts:

   - It will ask you to upload credentials if not found
   - It will ask you to login to Docker Hub
   - It will create all necessary files

4. After setup, update the `.env` files with your actual configuration:

```bash
nano ~/connect-career-be/services/connect-career-be/.env
nano ~/connect-career-be/services/ai-service/.env
```

5. Restart services after updating .env:

```bash
cd ~/connect-career-be/services
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml restart
```
