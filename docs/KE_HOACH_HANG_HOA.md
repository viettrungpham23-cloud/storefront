# Kế hoạch tích hợp ảnh và quản trị hàng hoá

## 1. Hiện trạng đã tích hợp

- Nguồn ảnh: `Stock-xe/processed/webp`, `Stock-xe/processed/thumb`, `Stock-xe/manifest/product-images.json`.
- Ảnh đã được đưa vào storefront tại:
  - `web/assets/vehicles/webp`
  - `web/assets/vehicles/thumb`
  - `web/assets/vehicles/manifest/product-images.json`
- Quy ước tên file: `{slug-mau-xe}-{slug-mau-sac}.webp`, ví dụ `evo-grand-lite-tim-lavender.webp`.
- `catalog.py` tự đọc manifest, tách slug mẫu xe và slug màu, sau đó gắn:
  - `colors[].photo`: ảnh lớn dùng khi cần hiển thị rõ.
  - `colors[].thumb`: ảnh nhẹ dùng cho danh sách.
  - `colors[].asset_slug` và `colors[].color_slug`: phục vụ đối soát sau này.
- UI catalog dùng ảnh thật nếu có, rơi về minh hoạ SVG khi thiếu ảnh.

## 2. Nguyên tắc cập nhật ảnh sau này

1. Chuẩn hoá tên mẫu xe theo `catalog.py`, ví dụ `feliz-ii`, `evo-grand`, `amio-s`.
2. Chuẩn hoá màu theo slug ngắn, ví dụ `den`, `do`, `trang`, `xanh-oliu`, `vang-cat`.
3. Đưa file ảnh vào pipeline `Stock-xe`, chạy lại script tạo manifest, rồi copy ba thư mục `webp`, `thumb`, `manifest` vào `web/assets/vehicles`.
4. Nếu có màu mới, bổ sung vào bảng `_COLOR_META` trong `catalog.py` để tên màu và mã màu hiển thị đúng.
5. Kiểm tra nhanh bằng API `/api/catalog?segment=all`: tổng số `colors[].photo` phải khớp số ảnh trong manifest.

## 3. Mục tiêu tính năng quản trị hàng hoá

Tách danh mục hàng hoá khỏi code tĩnh để chủ động thêm, sửa, ẩn, xoá mềm các nhóm:

- `vehicle`: xe điện.
- `accessory`: phụ kiện.
- `service`: dịch vụ giá trị gia tăng.
- `battery_plan`: tuỳ chọn thuê pin hoặc mua đứt pin.

Với xe điện, một sản phẩm có thể thuộc nhiều nhóm bán hàng:

- `doi_pin`: chỉ nhóm này có hai giá `thuê pin` và `mua đứt pin`.
- `kem_pin`: một giá trọn bộ kèm pin.
- `hoc_sinh`: nhóm học sinh/không cần bằng lái, có thể đồng thời là `doi_pin`.

## 4. Mô hình dữ liệu đề xuất

Tạo bảng nguồn chuẩn thay cho việc rebuild từ `catalog.py` mỗi lần chạy:

- `product_types`: danh mục loại hàng, ví dụ xe, phụ kiện, dịch vụ, gói pin.
- `products`: thông tin chung gồm slug, tên, loại hàng, trạng thái, badge, mô tả, sort.
- `product_segments`: nhiều-nhiều giữa sản phẩm và nhóm bán hàng.
- `product_prices`: giá mua đứt, giá thuê pin, phần trăm KM, ngày hiệu lực.
- `product_specs`: thông số kỹ thuật dạng JSON để dễ thêm cột mới.
- `product_colors`: màu, mã màu, ảnh lớn, ảnh thumbnail, asset slug.
- `product_inventory_aliases`: tên đối soát với kho/QLBH, ví dụ `FELIZ II`, `VERO X`.

Không hard-delete sản phẩm đã từng phát sinh đơn hàng. Khi cần xoá khỏi giao diện bán, dùng `status = archived` hoặc `sellable = false`.

## 5. API backend cần bổ sung

- `GET /api/admin/product-types`
- `POST /api/admin/product-types`
- `PATCH /api/admin/product-types/{key}`
- `DELETE /api/admin/product-types/{key}`: chỉ cho xoá khi chưa có sản phẩm dùng loại này.
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/{slug}`
- `PATCH /api/admin/products/{slug}/archive`
- `POST /api/admin/products/import-pricing`: nhập từ file bảng giá Excel.
- `POST /api/admin/products/sync-images`: quét manifest ảnh và gợi ý map theo tên file.
- `POST /api/admin/products/{slug}/images`: upload hoặc chọn ảnh từ thư viện `Stock-xe`.

API public `/api/catalog` vẫn giữ contract hiện tại để app bán hàng không phải đổi lớn.

## 6. UI/UX quản trị hàng hoá

Đặt trong `QLBH-Website/admin-dashboard` vì đây là nơi có vai trò admin và dữ liệu kho:

- Màn danh sách dạng bảng dày thông tin: ảnh, tên, loại hàng, nhóm bán, giá, KM, trạng thái, tồn kho, ảnh thiếu.
- Bộ lọc: loại hàng, nhóm bán, trạng thái, thiếu ảnh, thiếu giá, thiếu thông số.
- Drawer chỉnh sửa nhanh, tránh chuyển trang quá nhiều.
- Tab trong drawer:
  - Thông tin bán hàng.
  - Giá và khuyến mại.
  - Thông số kỹ thuật.
  - Màu và hình ảnh.
  - Đối soát kho.
- Nút thao tác rõ: thêm hàng, nhân bản mẫu, ẩn bán, lưu nháp, xuất Excel.

## 7. Lộ trình triển khai

1. Giữ `catalog.py` làm seed/fallback, đọc ảnh tự động từ manifest như hiện tại.
2. Thêm migration cho bảng product master trong backend quản trị.
3. Viết script import từ `catalog.py` và `product-images.json` vào product master.
4. Đổi `/api/catalog` sang đọc product master, giữ JSON trả về tương thích với UI hiện tại.
5. Làm màn quản trị hàng hoá trong admin dashboard.
6. Bổ sung phân quyền: chỉ `admin` được thêm/xoá loại hàng; `manager` được sửa giá/ảnh; `sales` chỉ xem.
7. Kiểm thử: import Excel, thêm mẫu xe mới, đổi ảnh màu, archive xe ngừng kinh doanh, xác nhận đơn hàng cũ vẫn xem được.

## 8. Rủi ro cần chốt trước khi làm CRUD

- Chọn nguồn chuẩn: SQLite storefront hiện tại hay database QLBH trung tâm. Khuyến nghị dùng QLBH trung tâm để đồng bộ kho, đơn hàng, quản trị.
- Xoá sản phẩm cần là xoá mềm để không làm hỏng lịch sử đơn hàng.
- Tên file ảnh phải có quy tắc cố định; nếu dùng tên tự do sẽ khó tự động map.
- Dòng `doi_pin` cần validation riêng: bắt buộc có `price_rent` và `price_buy`.
- Dòng `kem_pin` và `hoc_sinh` không được tự sinh lựa chọn thuê pin nếu không có giá thuê.
