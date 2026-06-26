#!/usr/bin/env bash
# Khởi chạy toàn bộ hệ thống QLBH: Backend (FastAPI :8000) + Frontend (React/Vite :5173).
# Tự dò trình thông dịch Python có sẵn FastAPI/uvicorn (ưu tiên venv theo README).
set -e
cd "$(dirname "$0")"

# --- Chọn Python có uvicorn ---
PY=""
for cand in "$HOME/venv/bin/python" "python3" "/usr/bin/python3" "/usr/local/bin/python3"; do
  if "$cand" -c "import uvicorn, fastapi, sqlalchemy" >/dev/null 2>&1; then PY="$cand"; break; fi
done
if [ -z "$PY" ]; then
  echo "✗ Không tìm thấy Python có FastAPI/uvicorn. Cài: pip install fastapi uvicorn sqlalchemy"
  exit 1
fi
echo "→ Python backend: $PY"

# --- Seed nếu CSDL trống (main.py cũng tự seed, đây là bước an toàn) ---
"$PY" -c "import os,sqlite3; \
db='xe_dien_thu_anh.db'; \
need = (not os.path.exists(db)); \
print('   • CSDL chưa có, sẽ tự seed khi khởi động' if need else '   • CSDL đã sẵn sàng')"

# --- Backend ---
echo "→ Khởi động Backend  : http://127.0.0.1:8000  (tài liệu API: /docs)"
"$PY" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACK=$!

# --- Frontend ---
echo "→ Khởi động Frontend : http://localhost:5173"
( cd admin-dashboard && npm install --silent >/dev/null 2>&1 || true; npm run dev )

# Khi tắt frontend thì tắt luôn backend
kill $BACK 2>/dev/null || true
