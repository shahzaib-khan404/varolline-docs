#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  uLovepdf — Startup script (Local Dev)
#
#  Architecture:
#    Browser → Next.js :3000
#                ├── pages/assets  (served directly)
#                └── /api/v1/*     (proxied → FastAPI :8001)
#
#  Usage:  ./start-demo.sh
# ─────────────────────────────────────────────────────────────

set -e

FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"

GREEN='\033[0;32m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         uLovepdf — Local Launcher        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Stop any running processes ────────────────────────────
echo -e "${YELLOW}▸ Stopping existing processes...${RESET}"
pkill -f "next dev"  2>/dev/null || true
pkill -f "uvicorn"   2>/dev/null || true
pkill -f "celery"    2>/dev/null || true
sleep 1

# ── 2. Write frontend env ─────────────────────────────────────
echo -e "${YELLOW}▸ Ensuring frontend environment...${RESET}"
cat > "$FRONTEND_DIR/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="uLovepdf"
BACKEND_PROXY_URL=http://localhost:8001
EOF

# ── 3. Start FastAPI backend ──────────────────────────────────
echo -e "${YELLOW}▸ Starting FastAPI backend...${RESET}"
cd "$BACKEND_DIR"
source .venv/bin/activate 2>/dev/null || true
uvicorn main:app --host 127.0.0.1 --port 8001 --reload > /tmp/ulovepdf-backend.log 2>&1 &
BACKEND_PID=$!

# ── 4. Start Next.js frontend ─────────────────────────────────
echo -e "${YELLOW}▸ Starting Next.js frontend...${RESET}"
cd "$FRONTEND_DIR"
npm run dev > /tmp/ulovepdf-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo -n -e "${YELLOW}▸ Waiting for frontend${RESET}"
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${RESET}"; break
  fi
  echo -n "."; sleep 2
done

# ── 5. Print summary ──────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║                     🚀  uLovepdf is LIVE!                    ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  ${CYAN}Local development URLs:${RESET}"
echo -e "${BOLD}║${RESET}  Frontend  →  http://localhost:3000"
echo -e "${BOLD}║${RESET}  Backend   →  http://localhost:8001"
echo -e "${BOLD}║${RESET}  API Docs  →  http://localhost:8001/docs"
echo -e "${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  ${YELLOW}Logs:${RESET}"
echo -e "${BOLD}║${RESET}  tail -f /tmp/ulovepdf-backend.log"
echo -e "${BOLD}║${RESET}  tail -f /tmp/ulovepdf-frontend.log"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop everything"
echo ""

# ── 6. Clean shutdown on Ctrl+C ──────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}▸ Shutting down all services...${RESET}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "uvicorn" 2>/dev/null || true
  echo -e "${GREEN}▸ Stopped.${RESET}"
  exit 0
}

trap cleanup INT TERM
wait $FRONTEND_PID
