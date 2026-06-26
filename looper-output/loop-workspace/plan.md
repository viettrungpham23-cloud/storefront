# Plan — app-quickbuy-orders (iteration 1)

## Mục tiêu
Nút "Mua ngay" trên thẻ xe ở Trang chủ / Danh mục / So sánh (tạo đơn nhanh) +
màn "Đơn hàng của tôi" liệt kê đơn theo SĐT kèm trạng thái realtime, đồng bộ Website.

## Quyết định thiết kế (đã cân nhắc)
- **Tab thứ 5:** thay tab placeholder `account` ("đang phát triển") → `orders` (Đơn hàng).
  Giữ 5 tab, không làm chật tab bar.
- **Định danh "đơn của tôi":** sau khi đặt thành công, lưu `ta_phone` vào localStorage;
  màn Đơn hàng gọi `/api/orders/mine?phone=<ta_phone>`. Chưa có → empty state.
- **Nguồn dữ liệu đơn:** đọc thẳng từ DB Website (`xe_dien_thu_anh.db`) qua `qlbh_sync.orders_for(phone)`
  → trạng thái realtime (pending/vin_verified/completed), không hardcode.

## Thay đổi cụ thể
### Frontend `web/app.js`
1. `cardHTML`: thêm nút **"Mua ngay"** vào body thẻ (ẩn/khóa khi hết hàng).
2. `bindCards`: wire nút mua (stopPropagation; `quickBuy(slug)`).
3. `quickBuy(slug)`: load product → addToCart(màu mặc định, option mặc định) → `push('checkout')`.
4. `SCREENS.compare`: thêm nút **"Mua"** mỗi cột xe (quick-buy theo cột).
5. `SCREENS.orders`: màn "Đơn hàng của tôi" — fetch `/api/orders/mine`, render danh sách
   (mã đơn, xe, ngày, tổng, **badge trạng thái**), empty state khi chưa có.
6. `renderTabbar` + `TAB_ICONS` + `TABS` + click handler: `account` → `orders`.
7. `placeOrder`: lưu `localStorage.ta_phone` khi đặt thành công.

### Style `web/styles.css`
8. `.card-buy` (nút mua trên thẻ), nút mua ở compare, `.order-item` + `.ostatus` badge.

### Backend
9. `server.py`: route `GET /api/orders/mine?phone=` → `qlbh_sync.orders_for(phone)`.
10. `qlbh_sync.py`: `orders_for(phone)` truy vấn Website DB, map trạng thái → nhãn VN.

### PWA
11. `sw.js`: bump `ta-store-v6` (đảm bảo bản mới tải ngay).

## Kiểm chứng
- `node --check web/app.js` (programmatic).
- `loop-workspace/checks/order_flow.py` (quick-buy → đơn đồng bộ → `/api/orders/mine` trả đơn + trạng thái).
- Judge rubric 6 chiều.
- Người ký duyệt qua ảnh 3 màn + màn đơn.

## Không phá vỡ
Giữ nguyên luồng giỏ hàng, so sánh, thanh toán + form CCCD/ảnh đã có. Nút card click vẫn mở chi tiết.
