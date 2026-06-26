# Loop: `app-quickbuy-orders`

Vòng lặp Looper xây tính năng **mua nhanh + quản lý đơn** cho app khách (`storefront/web`),
đồng bộ với Website QLBH.

## Mục tiêu
- Nút **"Mua ngay"** trên mọi thẻ xe ở **Trang chủ / Danh mục / So sánh** → tạo đơn nhanh.
- Màn **"Đơn hàng của tôi"** liệt kê đơn theo SĐT/cart-token + **trạng thái realtime** từ backend.
- Đồng bộ đơn sang DB Website (`QLBH-Website/xe_dien_thu_anh.db`, channel `App`, `pending`).

## File trong thư mục
| File | Vai trò |
|---|---|
| `loop.yaml` | Đặc tả vòng lặp (nguồn, người đọc). |
| `loop.resolved.json` | Bản biên dịch (runner đọc file này). |
| `LOOP.md` | Tóm tắt cho người đọc. |
| `RUN_IN_SESSION.md` | **Cách chạy trong session hiện tại** (đường dẫn dễ nhất). |
| `run-loop.py` | Runner ngoài (nâng cao, chạy sau / ngoài session). |
| `loop-workspace/` | `plan.md`, `delivery-{n}.md`, `review-{n}.md`, `state.json`, `run-log.md`, `checks/order_flow.py`. |

## Chạy
- **Trong session (khuyên dùng):** mở `RUN_IN_SESSION.md` và làm theo Operator Instructions.
- **Ngoài session (nâng cao):** `python3 run-loop.py` (cần PyYAML; đọc `loop.resolved.json`).

## Cổng kiểm chứng
- `js-syntax` (programmatic): `node --check web/app.js`.
- `order-flow` (programmatic): `python3 looper-output/loop-workspace/checks/order_flow.py`
  (cần app server chạy ở :8810; test sẽ fail tới khi endpoint `/api/orders/mine` được xây).
- `feature-complete` (judge — Claude): rubric 6 chiều.
- `visual-signoff` (human): ký duyệt bằng ảnh.

## Trần dừng
max 10 vòng · revise ≤ 3/cổng · no-progress ×2 · ngân sách 45 phút.

> Lưu ý môi trường: compile cần `PyYAML` trên **python3 (3.14)**; smoke test & server dùng stdlib nên chạy mọi python3.
