# app-quickbuy-orders

Thêm nút "Mua ngay" trên mọi thẻ xe (Trang chủ / Danh mục / So sánh) cho phép tạo đơn nhanh, và màn "Đơn hàng của tôi" quản lý đơn theo trạng thái đồng bộ với Website QLBH.

## Goal

Ứng dụng khách (storefront/web) có (1) nút "Mua ngay" một chạm trên MỌI thẻ sản phẩm ở Trang chủ, Danh mục và So sánh — thêm xe rồi vào thẳng thanh toán; và (2) màn "Đơn hàng của tôi" liệt kê đơn của khách (theo SĐT/cart-token) kèm trạng thái realtime lấy từ backend (chờ duyệt / đã đối soát / hoàn tất), đồng bộ với DB Website QLBH (xe_dien_thu_anh.db).

## Definition of Done

Nút "Mua ngay" hiển thị & hoạt động trên thẻ ở cả 3 màn; bấm tạo đơn đồng bộ (đơn App trạng thái pending trong Website); màn "Đơn hàng của tôi" liệt kê >=1 đơn kèm trạng thái lấy từ endpoint backend mới; `node --check web/app.js` pass; không có lỗi console trên preview; Judge chấm đạt rubric; người ký duyệt bằng ảnh.

## Verification

- `js-syntax` (programmatic)
- `order-flow` (programmatic)
- `feature-complete` (judge)
- `visual-signoff` (human)

## Council

- `reviewer-1`: judge via claude (default)

## Gates

- Plan gate: revise_until_clean
- Delivery gate: revise_until_clean

## Loop Control

- Max iterations: 10
- Budget: `{"tokens": 3000000, "wall_clock_min": 45}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["c\u00f9ng m\u1ed9t blocking issue l\u1eb7p l\u1ea1i", "delivery kh\u00f4ng thay \u0111\u1ed5i \u0111\u00e1ng k\u1ec3", "k\u1ebft qu\u1ea3 check kh\u00f4ng \u0111\u1ed5i"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "requires_approval": false}`

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

## Flow Preview

```text
+--------------------------------+
| 1. Goal + context              |
| read sources                   |
+--------------------------------+
               |
               v
+--------------------------------+
| 2. Draft plan.md               |
| state -> state.json            |
+--------------------------------+
               |
               v
+--------------------------------+
| 3. Plan gate                   |
| verdict: reviewer-1            |
+--------------------------------+
               | needs work -> revise <= 3 -> step 2
               | pass
               v
+--------------------------------+
| 4. Write delivery-N.md         |
| log -> run-log.md              |
+--------------------------------+
               |
               v
+--------------------------------+
| 5. Delivery gate               |
| verdict: reviewer-1            |
+--------------------------------+
               | needs work -> revise <= 3 -> step 4
               | pass
               v
+--------------------------------+
| 6. Final output                |
| all gates clean                |
+--------------------------------+

Stops: pass gates | max 10 iterations | no progress x2 | budget 45m, 3000000 tokens
```
