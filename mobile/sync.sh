#!/bin/bash
# Copy frontend (../web) into the Capacitor www/ folder and inject the backend URL.
#
#   API_BASE="https://your-backend.example.com" bash sync.sh
#
# API_BASE = URL công khai của backend đã deploy (KHÔNG có dấu "/" cuối).
# Bỏ trống → app sẽ gọi cùng origin (chỉ hợp lệ nếu dùng capacitor server.url).
set -e
cd "$(dirname "$0")"

API_BASE="${API_BASE:-}"
ADMIN_API_BASE="${ADMIN_API_BASE:-http://34.21.152.227:8000}"

rm -rf www && mkdir -p www
cp -R ../web/* www/

# Ghi đè config.js trong bản đóng gói để trỏ tới backend đã host.
printf 'window.TA_CONFIG = { apiBase: "%s", adminApiBase: "%s" };\n' "$API_BASE" "$ADMIN_API_BASE" > www/config.js

# Bản đóng gói không cần service worker tự đăng ký lại (Capacitor đã chạy offline),
# nhưng để nguyên cũng không sao. Giữ nguyên cho đơn giản.

echo "✓ web → www  (apiBase = '${API_BASE:-<trống>}', adminApiBase = '${ADMIN_API_BASE:-<trống>}')"

if [ -d android ] || [ -d ios ]; then
  npx cap sync android || true
  echo "✓ cap sync android xong"
else
  echo "ℹ Chưa có nền tảng nào. Chạy: npm run add:android  /  npm run add:ios"
fi
