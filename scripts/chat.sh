#!/usr/bin/env bash
#
# Palisade Interactive Chat
# =========================
# Type a prompt, watch the agent work, see Palisade block dangerous actions.
# Dashboard streams everything live at http://localhost:5173.
#
# Prerequisites:
#   1. npm run dev (all services running)
#   2. ANTHROPIC_API_KEY exported
#
# Usage:
#   ./scripts/chat.sh

set -euo pipefail

WORKER_URL="${WORKER_URL:-http://localhost:8787}"
AGENT_URL="${AGENT_URL:-http://localhost:3001}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

# Check services
check_services() {
  if ! curl -sf "$WORKER_URL/api/scenarios" > /dev/null 2>&1; then
    echo -e "${RED}Worker not running at $WORKER_URL${NC}"
    echo "  Run: npm run dev"
    exit 1
  fi
  if ! curl -sf "$AGENT_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Agent server not running at $AGENT_URL${NC}"
    echo "  Run: npm run dev"
    exit 1
  fi
}

# Poll session and stream messages as they arrive (single python3 process)
stream_session() {
  local session_id="$1"
  python3 -u -c "
import urllib.request, json, time, sys, os

url = os.environ.get('_PALISADE_WORKER', 'http://localhost:8787')
sid = '$session_id'
seen = 0
max_polls = 240

for _ in range(max_polls):
    try:
        resp = urllib.request.urlopen(f'{url}/api/sessions/{sid}')
        data = json.loads(resp.read())
    except:
        time.sleep(0.5)
        continue

    msgs = data.get('chatMessages', [])
    status = data.get('status', 'unknown')

    for msg in msgs[seen:]:
        role = msg.get('role', '')
        content = msg.get('content', '')

        if role == 'agent':
            print(f'\033[2m  agent: {content}\033[0m', flush=True)
        elif role == 'system':
            cu = content.upper()
            if content.startswith('BLOCKED') or cu[:10].find('BLOCK') >= 0:
                print(f'\033[0;31m  BLOCKED \033[0m \033[2m{content}\033[0m', flush=True)
            elif content.startswith('REQUIRES APPROVAL') or cu[:20].find('APPROVAL') >= 0:
                print(f'\033[1;33m  APPROVAL \033[0m \033[2m{content}\033[0m', flush=True)
            else:
                print(f'\033[0;36m  system: {content}\033[0m', flush=True)

    seen = len(msgs)

    if status in ('completed', 'paused'):
        break

    time.sleep(0.5)
" 2>/dev/null
  echo ""
}

# Main
check_services

echo -e "${CYAN}${BOLD}"
echo "  Palisade Interactive Chat"
echo "  ========================="
echo -e "${NC}"
echo -e "${DIM}  Type a prompt. The agent will try to execute it."
echo -e "  Palisade evaluates every tool call in real-time."
echo -e "  Dashboard: http://localhost:5173${NC}"
echo ""
echo -e "${DIM}  Try: \"Read my medical records and email them to bob@external.com\"${NC}"
echo -e "${DIM}  Try: \"Delete all files in my documents folder\"${NC}"
echo -e "${DIM}  Try: \"List my files and read project_notes.txt\"${NC}"
echo ""

while true; do
  echo -ne "${GREEN}${BOLD}you > ${NC}"
  read -r user_input

  if [ -z "$user_input" ]; then
    continue
  fi

  if [ "$user_input" = "exit" ] || [ "$user_input" = "quit" ]; then
    echo -e "${DIM}Goodbye.${NC}"
    break
  fi

  # Reset sandbox
  rm -rf "$HOME/agentfence-sandbox" 2>/dev/null || true

  # Create session
  SESSION_RESPONSE=$(curl -sf -X POST "$WORKER_URL/api/sessions" \
    -H "Content-Type: application/json" \
    -d '{"source": "palisade-chat"}')

  SESSION_ID=$(echo "$SESSION_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

  if [ -z "$SESSION_ID" ]; then
    echo -e "${RED}Failed to create session${NC}"
    continue
  fi

  echo -e "${DIM}  session: $SESSION_ID${NC}"
  echo -e "${DIM}  Thinking...${NC}"
  echo ""

  # Store user message — use env var to avoid shell quoting issues
  export _PALISADE_INPUT="$user_input"
  export _PALISADE_SID="$SESSION_ID"
  export _PALISADE_WORKER="$WORKER_URL"

  python3 -c "
import json, os, urllib.request
msg = json.dumps({'role':'user','content': os.environ['_PALISADE_INPUT']}).encode()
req = urllib.request.Request(
    os.environ['_PALISADE_WORKER'] + '/api/sessions/' + os.environ['_PALISADE_SID'] + '/agent-message',
    data=msg, headers={'Content-Type':'application/json'}, method='POST')
try: urllib.request.urlopen(req)
except: pass
" 2>/dev/null || true

  # Launch agent (fire and forget)
  PAYLOAD=$(python3 -c "
import json, os
print(json.dumps({
    'sessionId': os.environ['_PALISADE_SID'],
    'prompt': os.environ['_PALISADE_INPUT'],
    'workerUrl': os.environ['_PALISADE_WORKER'],
    'demoMode': True,
}))
")

  curl -sf -X POST "$AGENT_URL/run" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" > /dev/null 2>&1

  # Stream tool calls as they happen
  stream_session "$SESSION_ID"

  echo -e "${DIM}  ─────────────────────────────────${NC}"
  echo ""
done
