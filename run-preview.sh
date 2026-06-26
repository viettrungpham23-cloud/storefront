#!/bin/bash
# Entry điểm cho Claude_Preview: nằm trong storefront/ để sandbox cấp quyền đọc
# cả cây thư mục này, rồi gọi Python phục vụ server.
cd "$(dirname "$0")"
exec /usr/bin/python3 server.py
