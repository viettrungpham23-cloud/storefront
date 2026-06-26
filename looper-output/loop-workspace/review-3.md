# Review 3 — delivery_gate iteration 2 (judge: reviewer-1, in-session)

## Programmatic (chạy trước judge)
- `js-syntax`: **PASS** — `node --check web/app.js` exit 0.
- `order-flow` (mở rộng): **PASS** — linh kiện vào giỏ (addon_total>0), mã DOIPIN15
  giảm 1.500.000đ, mã KEMPIN3 không đủ điều kiện bị từ chối (HTTP 400), tạo đơn đồng bộ
  + `/api/orders/mine` trả đơn `pending`. exit 0.

## Judge — rubric mở rộng (scope iteration 2)

```json
{
  "verdict": "pass",
  "blocking_issues": [],
  "confidence": 0.84,
  "notes": "Đủ scope mới. (1) Checkout giữ nguyên + nhận breakdown mới. (2) Mã ưu đãi: nhập tay + sheet danh sách 5 mã; áp được cả % (GIAM5 5%, KEMPIN3 3%) và tiền (TROGIA2TR, DOIPIN15); ÁP THEO SẢN PHẨM ĐƠN LẺ qua scope (all/đổi pin/kèm pin/phụ kiện) — mã không đủ điều kiện bị từ chối HTTP 400 (curl + smoke xác nhận). (3) Danh sách so sánh có nút xoá nhanh trong Danh mục (ảnh thanh compare có nút xoá). (4) Giỏ có 'Mua thêm' + 'Thanh toán' và mục linh kiện kèm theo (ảnh giỏ). (5) Giỏ gợi ý linh kiện/dịch vụ mua kèm: thảm, mũ, áo mưa, áo phông, quây, dán xe, đăng ký biển (ảnh 'Gợi ý mua kèm'). (6) Danh mục có mục 'Dịch vụ & phụ kiện' (VAS) đầy đủ 8 mục (ảnh). Tính tiền đúng: tổng 24.055.000đ với mã GIAM5 áp trên giỏ Feliz II + 2 phụ kiện (DOM xác nhận promoApplied=true). Ghi chú: ảnh promo-banner/summary ở dưới nếp gấp, đã xác nhận qua DOM do screenshot preview hay race."
}
```

Verdict: **pass** (revision 0/3). Delivery gate iter 2 sạch → human visual-signoff để đóng loop.
