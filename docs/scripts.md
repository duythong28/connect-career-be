Repo Scripts Overview

General
- All scripts live in `scripts/` and are Bash-based (works in CI and WSL/macOS). On Windows, run via Git Bash or WSL.

Scripts
- `scripts/ci-node.sh`: Lint, test, and build the NestJS service (`services/connect-career-be`).
- `scripts/ci-python.sh`: Lint and test the FastAPI service (`services/ai-service`).
- `scripts/dev-node.sh`: Install deps and run NestJS in watch mode.
- `scripts/dev-python.sh`: Create `.venv`, install deps, and run FastAPI with `uvicorn --reload`.
- `scripts/deploy-render.sh`: Trigger a Render deploy using a Deploy Hook URL (arg or env var).
- `scripts/validate-all.sh`: Run both services’ checks end-to-end locally.

Examples
- Node CI locally: `bash scripts/ci-node.sh`
- Python CI locally: `bash scripts/ci-python.sh`
- Start Node dev server: `bash scripts/dev-node.sh`
- Start Python dev server on custom port: `PORT=8080 bash scripts/dev-python.sh`
- Trigger Render deploy: `bash scripts/deploy-render.sh https://api.render.com/deploy/srv-...`
  - Or set `RENDER_DEPLOY_HOOK_URL` / `RENDER_AI_DEPLOY_HOOK_URL` env var.

Tips
- Keep CI and local flows consistent by having GitHub Actions call these scripts (optional).
- Add service-specific scripts (e.g., DB migrations) alongside once you introduce those tools.

