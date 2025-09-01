CI/CD with GitHub Actions and Render

Overview
- CI runs lint, unit tests, e2e tests, and build for `services/connect-career-be` on pushes and PRs to `main`.
- On push to `main`, a deploy is triggered to Render via a Deploy Hook URL (if configured as a GitHub secret).
- A separate CI pipeline validates `services/ai-service` (FastAPI) and can trigger its own Render deploy hook.

Files
- `.github/workflows/ci.yml`: CI pipeline and optional Render deploy.
- `.github/workflows/ci-ai.yml`: Python CI for `services/ai-service` and optional deploy.
- `services/connect-career-be/package.json`: Adds `engines.node >= 20` to match the CI runtime.
- `render.yaml` (optional): Blueprint to codify your Render service (see below).

Prereqs
- Node 20+ is used in CI. Ensure your Render service uses Node 20+ as well.
- Your Render Web Service should point to the repo with Root Directory `services/connect-career-be`.

Render Setup
1) Create or configure a Web Service in Render
   - Root Directory: `services/connect-career-be`
   - Runtime: Node
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start:prod`
   - Auto Deploy: (choose based on preference)
     - If using GitHub Actions deploy hook (below), you can set Auto Deploy to "No".
     - If using Render’s auto-deploy, you can set Auto Deploy to "Yes" and optionally require passing checks.

2) Environment
   - Add your environment variables in Render (e.g., database URLs, secrets).
   - Optional: Configure a Node version in the service (or via `engines.node` as committed).

3) Deploy Hook (for GitHub Actions-triggered deploy)
   - In Render, open your service → Settings → Deploy Hooks → Create Deploy Hook.
   - Copy the generated URL.
   - In GitHub, add a repository secret:
     - Name: `RENDER_DEPLOY_HOOK_URL`
     - Value: the copied URL

GitHub Branch Protection (optional)
- In GitHub → Settings → Branches → Branch protection rules → Add/Update rule for `main`.
- Require status checks to pass before merging, and add: `CI / Build, Lint, and Test`.

Render Blueprint (optional)
If you prefer to declare your Render resources as code, you can use the `render.yaml` included at the repo root. After adjusting names/plan/env vars, you can import it in Render:
- Render Dashboard → Blueprints → New from Blueprint → Upload `render.yaml`.

Python FastAPI (ai-service)
- Location: `services/ai-service`
- Entrypoint: `app/main.py` with `/health` endpoint for smoke checks.
- Requirements:
  - `requirements.txt` (runtime)
  - `requirements-dev.txt` (dev/test: pytest, ruff)
- Render service (in `render.yaml`):
  - `runtime: python`
  - `buildCommand: pip install -r requirements.txt`
  - `startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Set environment variables in Render as needed.
- CI: `.github/workflows/ci-ai.yml`
  - Python 3.12
  - Install runtime + dev deps
  - Lint with `ruff`, test with `pytest`
  - Optional deploy via `RENDER_AI_DEPLOY_HOOK_URL`
  - In Render, set Python version to 3.12 in service settings.

GitOps Guidance
- Single source of truth: keep infra-as-code in `render.yaml`; update via PRs.
- Separate services: each service has its own CI workflow and deploy hook to isolate changes.
- Immutable deploys: tie Render deploys to `main` merges only; protect `main` with required CI checks.
- Secrets management: store deploy hook URLs and runtime secrets in GitHub/Render secrets, not in the repo.
- Health checks: expose `/health` endpoints to validate readiness after deploy.
- Rollback plan: use Render’s service Deploys history to roll back to a previous build if needed.

Local Testing
- From `services/connect-career-be`:
  - Install: `npm ci`
  - Lint: `npm run lint`
  - Unit tests: `npm test`
  - E2E tests: `npm run test:e2e`
  - Build: `npm run build`
