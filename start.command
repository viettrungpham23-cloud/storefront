#!/bin/bash
# Khởi động cửa hàng xe điện TA innovation (double-click để chạy)
cd "$(dirname "$0")"
echo "Đang mở http://localhost:8810 …"
( sleep 1.2; open "http://localhost:8810" ) &
python3 server.py
