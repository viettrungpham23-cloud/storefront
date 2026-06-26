# Delivery 2 — mở rộng checkout / ưu đãi / phụ kiện (iteration 2)

Nguồn: human visual-signoff iter 1 trả "revise" kèm scope mới.

## Đã làm
- `catalog.py`: `PROMOS` (5 mã — % & tiền, theo phân khúc/all/addon) + `ADDONS`
  (8 linh kiện/dịch vụ: thảm, mũ, áo mưa, áo phông, quây, dán xe, đăng ký biển, bảo dưỡng)
  + `find_promo` / `find_addon`.
- `server.py`:
  - schema: cột `carts.promo_code` + bảng `cart_addons`.
  - `compute_cart`: cộng linh kiện, áp mã ưu đãi (percent/amount, theo scope), trả breakdown
    (`veh_subtotal`, `addon_total`, `product_discount`, `promo_discount`, `applied_promo`).
  - endpoints: `GET /api/promos`, `GET /api/addons`, `POST/DELETE /api/cart/promo`,
    `POST /api/cart/addons`, `DELETE /api/cart/addons/<sku>`.
  - fix: `ensure_cart` chỉ định cột (carts có thêm promo_code).
- `web/app.js`:
  - Giỏ: dòng linh kiện kèm theo, **"Gợi ý mua kèm"**, **mã ưu đãi** (nhập + sheet danh sách),
    **"Mua thêm"**, summary breakdown; action bar có **Mua thêm + Thanh toán**.
  - Danh mục: mục **"Dịch vụ & phụ kiện"** (VAS) + **nút xoá nhanh** danh sách so sánh.
  - data actions: `addAddon/removeAddon/applyPromo/removePromo/ensureAddons/ensurePromos/clearCompare/openPromoSheet`.
- `web/styles.css`: addon-card/line, promo-row/applied/sheet, buy-more, cmp-clear.
- `web/sw.js`: bump `ta-store-v7`.

## Kiểm chứng
- `node --check web/app.js`: PASS.
- `order_flow.py` (mở rộng): PASS — linh kiện vào giỏ, mã DOIPIN15 giảm 1.5tr,
  mã KEMPIN3 không đủ điều kiện bị từ chối (HTTP 400), đơn vẫn đồng bộ + /api/orders/mine.
- API trực tiếp: DOIPIN15 −1.5tr · GIAM5 5%=1.845tr · PHUKIEN10 10% addon=25k · KEMPIN3 → 400.
- Ảnh: mục VAS danh mục, nút xoá compare, giỏ có linh kiện + gợi ý + Mua thêm, mã áp dụng (total 24.055.000₫).
