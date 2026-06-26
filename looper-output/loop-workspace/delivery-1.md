# Delivery 1 — app-quickbuy-orders

## Đã làm
- `web/app.js`
  - `cardHTML`: thêm nút **"Mua ngay"** (khóa "Hết hàng" khi tồn kho 0).
  - `bindCards`: wire `[data-buy]` (stopPropagation, không mở chi tiết).
  - `quickBuy(slug)`: load SP → addToCart(màu/option mặc định) → `push('checkout')`.
  - `SCREENS.compare`: nút **"Mua"** mỗi cột (tôn trọng tồn kho) + wire.
  - `SCREENS.orders` + `renderOrders`: màn "Đơn hàng của tôi", fetch `/api/orders/mine?phone=`,
    badge trạng thái (Chờ duyệt / Đã đối soát VIN / Hoàn tất / Đã hủy), empty state.
  - Tab bar: `account` → `orders` (label, icon, TABS, click handler).
  - `placeOrder`: lưu `localStorage.ta_phone` khi đặt thành công.
  - `showSuccess`: thêm nút **"Xem đơn của tôi"** → tab Đơn hàng.
- `web/styles.css`: `.card-buy`, `.cmp-buy`, `.order-item`/`.ostatus`, `.suc-actions`.
- `server.py`: route `GET /api/orders/mine?phone=` → `qlbh_sync.orders_for`.
- `qlbh_sync.py`: `orders_for(phone)` đọc Website DB + map nhãn trạng thái.
- `web/sw.js`: bump `ta-store-v6`.

## Cách kiểm
- `node --check web/app.js`
- `looper-output/loop-workspace/checks/order_flow.py` (server :8810 chạy bản mới)
- Judge rubric 6 chiều + ảnh chụp.
