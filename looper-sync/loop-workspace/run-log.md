# Run log — app-web-sync-check

- [iter 1] setup: App :8810 (server.py) + Web FastAPI :8000 (uvicorn) đã chạy SONG SONG; Vite :5173 (UI admin) tắt — không cần cho kiểm tra dữ liệu.
- [iter 1] delivery_gate run 1: sync_check.py = 8/9. Lỗi: "Thông báo (sales) có đơn mới" — bộ lọc `substr(created_at,1,10) <= date('now')` loại đơn vừa tạo do lệch UTC (date('now')) vs giờ local của created_at.
- [iter 1] revise (1/3): sửa `qlbh_sync.notifications` → `date('now','+1 day')`; restart app server.
- [iter 1] delivery_gate run 2: sync_check.py = **9/9 — ĐỒNG BỘ OK** (exit 0). Đơn test DH02563 (sales SA3) đi App→Web→admin→App tròn vòng.
- [iter 1] compile: loop.yaml → loop.resolved.json / LOOP.md / RUN_IN_SESSION.md OK (đã thêm plan_gate).
- [iter 1] operator-confirm: APPROVED ("Đạt — đóng loop"). Stop condition met (sync_check exit 0 + operator). LOOP COMPLETED (1 iter, 1 delivery revision, found+fixed notification TZ filter bug).
