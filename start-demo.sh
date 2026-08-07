#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Varolline Docs — Demo startup script
#
#  Architecture (single ngrok tunnel):
#    Browser → https://<your-ngrok-domain>.ngrok-free.app
#                  └── Next.js :3000
#                          ├── pages/assets  (served directly)
#                          └── /api/v1/*     (proxied → FastAPI :8001)
#
#  Setup before running:
#    1. Install ngrok: https://ngrok.com/download
#    2. Sign up at ngrok.com and get your free static domain
#    3. Set your ngrok authtoken: ngrok config add-authtoken <YOUR_AUTHTOKEN>
#    4. Update ngrok.yml tunnel domain to your static domain
#    5. Replace PUBLIC_URL below with your ngrok static domain
#
#  Usage:  ./start-demo.sh
# ─────────────────────────────────────────────────────────────

set -e

FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"

# ── CONFIGURE THIS ────────────────────────────────────────────
# Replace with your ngrok static domain (free at ngrok.com → Cloud Edge → Domains)
# Example: https://your-unique-name.ngrok-free.app
PUBLIC_URL="https://YOUR-NGROK-DOMAIN.ngrok-free.app"
# ─────────────────────────────────────────────────────────────

GREEN='\033[0;32m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      Varolline Docs — Demo Launcher      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Stop any running processes ────────────────────────────
echo -e "${YELLOW}▸ Stopping existing processes...${RESET}"
pkill -f "ngrok"     2>/dev/null || true
pkill -f "next dev"  2>/dev/null || true
pkill -f "uvicorn"   2>/dev/null || true
pkill -f "celery"    2>/dev/null || true
sleep 1

# ── 2. Write frontend env pointing to itself (proxy handles API)
echo -e "${YELLOW}▸ Writing frontend environment...${RESET}"
cat > "$FRONTEND_DIR/.env.local" << EOF
# In demo mode, Next.js proxies /api/v1/* to FastAPI via next.config rewrites.
# So NEXT_PUBLIC_API_URL uses the same public domain — no separate backend URL needed.
NEXT_PUBLIC_API_URL=${PUBLIC_URL}
NEXT_PUBLIC_APP_URL=${PUBLIC_URL}
NEXT_PUBLIC_APP_NAME="Varolline Docs"
BACKEND_PROXY_URL=http://localhost:8001
EOF

# ── 3. Start FastAPI backend ──────────────────────────────────
echo -e "${YELLOW}▸ Starting FastAPI backend...${RESET}"
cd "$BACKEND_DIR"
source .venv/bin/activate 2>/dev/null || true
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload > /tmp/varolline-backend.log 2>&1 &
BACKEND_PID=$!

# ── 4. Start Celery worker ────────────────────────────────────
echo -e "${YELLOW}▸ Starting Celery worker...${RESET}"
celery -A app.workers.celery_app worker --loglevel=warning -c 2 > /tmp/varolline-celery.log 2>&1 &
CELERY_PID=$!

# ── 5. Start Next.js frontend ─────────────────────────────────
echo -e "${YELLOW}▸ Starting Next.js frontend...${RESET}"
cd "$FRONTEND_DIR"
npm run dev > /tmp/varolline-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo -n -e "${YELLOW}▸ Waiting for frontend${RESET}"
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${RESET}"; break
  fi
  echo -n "."; sleep 2
done

# ── 6. Start ngrok ─────────────────────────────────────────────
echo -e "${YELLOW}▸ Starting ngrok tunnel...${RESET}"
ngrok start frontend > /tmp/varolline-ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok
echo -n -e "${YELLOW}▸ Waiting for ngrok${RESET}"
for i in {1..15}; do
  if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${RESET}"; break
  fi
  echo -n "."; sleep 1
done

# ── 7. Print summary ──────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║                    🚀  Demo is LIVE!                         ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  ${CYAN}Share this URL with anyone:${RESET}"
echo -e "${BOLD}║${RESET}  ${GREEN}${BOLD}${PUBLIC_URL}${RESET}"
echo -e "${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  ${CYAN}Local dev URLs:${RESET}"
echo -e "${BOLD}║${RESET}  Frontend  →  http://localhost:3000"
echo -e "${BOLD}║${RESET}  Backend   →  http://localhost:8001"
echo -e "${BOLD}║${RESET}  API Docs  →  http://localhost:8001/docs"
echo -e "${BOLD}║${RESET}  ngrok UI  →  http://localhost:4040"
echo -e "${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  ${YELLOW}Logs:${RESET}"
echo -e "${BOLD}║${RESET}  tail -f /tmp/varolline-backend.log"
echo -e "${BOLD}║${RESET}  tail -f /tmp/varolline-frontend.log"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop everything"
echo ""

# ── 8. Clean shutdown on Ctrl+C ──────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}▸ Shutting down all services...${RESET}"
  kill $NGROK_PID $BACKEND_PID $CELERY_PID $FRONTEND_PID 2>/dev/null || true
  pkill -f "ngrok" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "uvicorn" 2>/dev/null || true
  pkill -f "celery" 2>/dev/null || true

  # Restore local development env
  cat > "$FRONTEND_DIR/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Varolline Docs"
BACKEND_PROXY_URL=http://localhost:8001
EOF

  echo -e "${GREEN}▸ Done. Local env restored.${RESET}"
  exit 0
}

trap cleanup INT TERM
wait $FRONTEND_PID
