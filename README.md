# TA innovation — App bán hàng xe điện (VinFast Thu Anh)

Ứng dụng **bán hàng kiểu iOS** cho nhân viên sales đại lý: duyệt xe → tư vấn →
lập đơn cho khách (quét CCCD bằng jsQR siêu mượt, chụp ảnh hồ sơ) → **đồng bộ thẳng lên Website quản trị (QLBH)**.
Front-end SPA thuần (HTML/CSS/JS, chuyển màn mượt) + back-end Python stdlib kết nối **Supabase (PostgreSQL)**.
Là **PWA**, đóng gói được thành **APK (Android)** và **IPA (iPhone)** bằng Capacitor (tích hợp luồng Đăng nhập Google Auth bảo mật).

---

## 1. Tính năng chính

- **Mua sắm**: trang chủ ưu đãi (cập nhật động theo tháng), danh mục theo phân khúc + **tab Dịch vụ & Phụ kiện**, chi tiết xe (chọn màu, thuê pin/mua đứt), so sánh tối đa 3 xe (tích hợp nút tắt ✕ nhanh thanh so sánh), **tồn kho realtime** (hết hàng → khoá mua).
- **Giỏ hàng**: tính toán ngày giao hàng linh động (thực tế từ hôm nay), tự áp `HOCSINH16` −16%; linh kiện kèm theo; gợi ý mua kèm; mã ưu đãi; **Mua thêm + Thanh toán** (pin đáy).
- **Lập đơn (3 bước)**: Giỏ → **Thanh toán** (biểu mẫu khách + **quét QR CCCD bằng jsQR độc lập** tự điền + **chụp/đính ảnh hồ sơ** + thanh "Hồ sơ %") → **Hoàn tất**.
- **Đồng bộ Website**: đơn đặt trên App tạo **Khách hàng + mở Đơn (chờ duyệt)** trong DB Website, **khoá VIN**, quy về **nhân viên/đơn vị**.
- **Đơn hàng của tôi** + **Thông báo**: quản lý theo vòng đời (mở → duyệt → hoàn tất). **Click** vào từng đơn hàng hoặc thông báo để xem trực tiếp **chi tiết trạng thái, danh sách sản phẩm và tổng tiền**.
- **Cài đặt & Hồ sơ nhân viên Sales**: Đăng nhập qua **Google Auth** (chỉ cho phép các email được uỷ quyền), hồ sơ + chỉ tiêu + doanh thu realtime.

---

## 2. Chạy nhanh (localhost)

App sử dụng Python để chạy API và kết nối với Supabase (PostgreSQL):

```bash
cd storefront
# Đảm bảo bạn đã cấu hình DATABASE_URL trong .env
python3 server.py            # → http://localhost:8810   (đổi cổng: PORT=9000 python3 server.py)
```
Hoặc double-click **`start.command`** (tự mở trình duyệt). DB `store.db` (giỏ hàng) tự tạo lần đầu.

**Để thấy đồng bộ App ↔ Website**, bật cả hai cùng lúc:

```bash
# Cửa sổ 1 — App khách/sales            # Cửa sổ 2 — Website quản trị (QLBH)
cd storefront                            cd storefront/QLBH-Website
python3 server.py    # :8810             ./start.sh        # FastAPI :8000 + React :5173
```
App và Website **đọc/ghi chung cơ sở dữ liệu Supabase PostgreSQL** → đơn từ App hiện ngay ở
màn **"Đối soát & Duyệt"** của Admin. Mọi thay đổi về tồn kho, đơn hàng diễn ra theo thời gian thực.

---

## 3. Màn hình & luồng

| # | Màn | Nội dung |
|---|---|---|
| 1 | **Trang chủ** | Banner ưu đãi, chip phân khúc, "Đề xuất", popup −16% (đếm ngược). |
| 2 | **Danh mục** | Lọc phân khúc (Đổi pin/Kèm pin/Học sinh) + tab **🛠️ Dịch vụ & Phụ kiện**; tồn kho "Còn N xe"; nút **Mua ngay** mỗi thẻ; xoá nhanh danh sách so sánh. |
| 3 | **Chi tiết** | Gallery, chọn màu, thuê pin/mua đứt, thông số, trạng thái tồn kho. |
| 4 | **So sánh** | Tối đa 3 xe cạnh nhau + Mua ngay mỗi cột. |
| 5 | **Giỏ hàng** | Hiển thị ngày nhận hàng dự kiến động; tự áp `HOCSINH16` −16%; linh kiện kèm theo; gợi ý mua kèm; mã ưu đãi; **Mua thêm + Thanh toán** (pin đáy). |
| 6 | **Thanh toán (02)** | Thông tin khách (họ tên/SĐT/CCCD/ngày sinh/giới tính/địa chỉ/email), **quét QR CCCD (jsQR mượt mà 100% dòng máy)**, **chụp ảnh hồ sơ**, thanh **Hồ sơ %**, phương thức (Visa/VNPay/trả góp 0%), nút **"Đặt hàng →" (Bước 3)**. |
| 7 | **Hoàn tất (03)** | "Đặt hàng thành công", mã đơn App + **mã đơn đại lý** đã đồng bộ, VIN đã khoá. |
| + | **Đơn hàng của tôi** | Đơn theo SĐT + trạng thái realtime. **(Click vào xem chi tiết)** |
| + | **Thông báo** (🔔) | Đơn mở · được duyệt · hoàn tất. **(Click vào xem chi tiết đơn)** |
| + | **Cài đặt / Hồ sơ** (⚙️) | Đăng nhập an toàn qua **Google Auth**, hồ sơ nhân viên sales, chỉ tiêu/doanh thu. |

Chuyển cảnh kiểu iOS (push/pop trượt phải, vuốt mép trái để back, cross-fade đổi tab, sheet trượt đáy); tab bar tự ẩn ở các luồng đẩy; tôn trọng `prefers-reduced-motion`.

---

## 4. Đồng bộ App ↔ Website QLBH

Chung một CSDL **Supabase (PostgreSQL)**, cầu nối qua [`qlbh_sync.py`](qlbh_sync.py):

- **Tồn kho realtime** — `/api/catalog` & `/api/products/<slug>` lấy `stock` từ `inventory_items` (status `available`) của Website.
- **Đặt hàng → Website** — `POST /api/orders` tự: tạo **Khách hàng** (trùng CCCD/SĐT thì dùng lại) + ghi hồ sơ ra `customer_db/`; **khoá VIN** (`available→reserved`); tạo **Đơn** `channel=App`, `pending`, gắn `sales_id` + cơ sở. Ảnh đính kèm lưu `.svg` chia nhóm.
- **Phản ánh ngược** — `/api/orders/mine`, `/api/notifications`, hồ sơ sales đều đọc realtime từ Website.

Không có DB Website → App vẫn chạy độc lập (sync tự tắt).

---

## 5. Cấu trúc thư mục

```
storefront/
├── server.py        # HTTP (stdlib) + REST API + kết nối Supabase (App :8810)
├── qlbh_sync.py     # CẦU NỐI đồng bộ App ↔ Website (dùng chung Supabase DB)
├── catalog.py       # sản phẩm, mã ưu đãi (PROMOS), linh kiện/VAS (ADDONS)
├── store.db         # SQLite cục bộ của App (chỉ lưu giỏ hàng tạm)
├── start.command    # launcher double-click
├── PACKAGING.md     # (tham khảo) bản chi tiết đóng gói APK/IPA
├── QLBH-Website/    # Website quản trị (FastAPI + React) — DB & nhân viên dùng chung
├── web/             # FRONT-END App (nguồn đóng gói mobile)
│   ├── config.js    # apiBase: "" (local) | URL backend public (đóng gói)
│   ├── index.html · styles.css · app.js
│   ├── manifest.webmanifest · sw.js   # PWA (cache ta-store-v18)
│   └── assets/      # logo, icon-192/512, ảnh xe, scooter SVG theo màu
└── mobile/          # Vỏ NATIVE Capacitor để xuất APK/IPA
    ├── capacitor.config.json   # appId vn.tainnovation.store · appName "TA innovation"
    ├── sync.sh                 # copy web/ → www/ + nhúng apiBase
    ├── www/                    # bản web đã đóng gói (do sync.sh sinh)
    ├── android/                # dự án Gradle (đã scaffold)
    └── ios/                    # dự án Xcode (đã scaffold)
```

---

## 6. API (JSON)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/catalog?segment=all\|doi_pin\|kem_pin\|hoc_sinh` | danh mục + phân khúc + **tồn kho** (sync) |
| GET | `/api/products/<slug>` · `/api/promo` · `/api/promos` · `/api/addons` | chi tiết / ưu đãi / mã / linh kiện-VAS |
| GET/POST/PATCH/DELETE | `/api/cart` · `/api/cart/items[/<id>]` · `/api/cart/addons[/<sku>]` · `/api/cart/promo` | giỏ hàng (header `X-Cart-Token`) |
| POST | `/api/orders` | tạo đơn `{name,phone,cccd,dob,gender,address,email,payment,images[],sales_id}` → **đồng bộ Website** |
| GET | `/api/orders/<order_no>` · `/api/orders/mine?phone=` | tra đơn / đơn của tôi |
| GET | `/api/sales` · `/api/sales/<id>[/stats]` · `/api/notifications?sales_id=` | nhân viên / thống kê / thông báo |

---

## 7. Dữ liệu

10 mẫu xe (Feliz II, Feliz Neo, Vero X, Evo Grand, Feliz 2025, Evo, Amio, Flazz, Zgoo, Evo Grand Lite),
giá & màu theo thiết kế; tồn kho lấy từ kho thật Website (`app/inventory_clean.json` — 2.998 VIN).
Ưu đãi **HOCSINH16 −16%** cho phân khúc học sinh. Mã ưu đãi áp tay & linh kiện/VAS khai báo trong [`catalog.py`](catalog.py).

---

## 8. 📦 Đóng gói lên điện thoại (APK / IPA)

App là web app + backend Python. Vì dữ liệu lấy từ backend, **bước đầu tiên luôn là deploy backend**,
sau đó chọn 1 trong 3 cách đưa lên máy: **PWA** (nhanh nhất) · **APK** (Android) · **IPA** (iPhone).

### 8.0 — Deploy backend (BẮT BUỘC)

Điện thoại không có Python nên API phải chạy ở **URL HTTPS công khai** (PWA/iOS chặn HTTP).
Backend là Python thuần nên chạy được mọi nơi:

```bash
HOST=0.0.0.0 PORT=8810 python3 server.py    # nhận kết nối ngoài
```
Gợi ý host (có HTTPS sẵn): **Render.com / Railway.app / Fly.io** (start command `python3 server.py`,
đặt `HOST=0.0.0.0`, để nền tảng tự cấp `PORT`) — hoặc **VPS** sau nginx/Caddy.
CORS đã mở (`Access-Control-Allow-Origin: *`). Database đã được đưa lên **Supabase**.

Sau khi có URL (vd `https://api-tainnovation.onrender.com`), dùng cho các bước dưới.

### 8.1 — PWA (cài ngay, không build · cả iPhone & Android)

App đã là PWA (manifest + service worker + icon). Host `server.py` ở URL HTTPS → mở trên điện thoại:
- **iPhone (Safari):** Chia sẻ → **Thêm vào Màn hình chính** → chạy toàn màn hình, có icon.
- **Android (Chrome):** menu ⋮ → **Cài đặt ứng dụng** → tạo WebAPK có icon.

Ưu: 0 công cụ, cập nhật tức thì. Nhược: không phải file `.apk/.ipa` rời.

### 8.2 — APK (Android, file cài thật)

Dự án đã được thiết lập quy trình tự động hoá **CI/CD qua GitHub Actions**. Bạn chỉ cần push code lên nhánh `main`, hệ thống sẽ tự động build file APK debug và cung cấp link tải ở mục **Actions**.
File APK release cần ký bằng keystore lưu trong secret/biến môi trường CI, không commit trực tiếp keystore vào repository.

**Cách B — Không cài toolchain: PWABuilder.** Host PWA (§8.1) → vào **https://www.pwabuilder.com**,
dán URL → **Android → Generate** → tải **APK đã ký** + bản **AAB** cho CH Play.

### 8.3 — IPA (iPhone, ràng buộc của Apple)

Không thể tạo `.ipa` tự do như Android. Cần: **Mac có Xcode** + **CocoaPods** + tài khoản Apple
(**Apple ID miễn phí** → cài lên máy mình, hết hạn 7 ngày · **Apple Developer $99/năm** → lâu dài / TestFlight / App Store).

```bash
cd storefront/mobile
sudo gem install cocoapods                                # nếu chưa có (chỉ trên Mac)
# ios/ đã scaffold sẵn; nếu chưa có: npm run add:ios
API_BASE="https://api-cua-ban.example.com" npm run sync    # copy web/→www/ + cap sync (chạy pod install)
npx @capacitor/assets generate --ios                       # icon/splash (tuỳ chọn)
npm run open:ios                                           # mở Xcode
```
Trong Xcode: chọn **Team** (Apple ID) → cắm iPhone → **Run** (cài thử) hoặc **Product → Archive → Distribute** (xuất `.ipa`).
Không có Mac/Xcode? Dùng build cloud (**Ionic Appflow / Codemagic / EAS Build** — vẫn cần tài khoản Apple để ký),
hoặc dùng **PWA** (§8.1) cho iPhone.

### 8.4 — Bảng tóm tắt

| Mục tiêu | Cách | Cần gì |
|---|---|---|
| Lên cả 2 máy NGAY | **PWA** (§8.1) | Chỉ cần host backend HTTPS |
| File **`.apk`** | Capacitor `npm run apk` **hoặc** PWABuilder | JDK+SDK **hoặc** chỉ URL |
| File **`.ipa`** | Capacitor + Xcode **hoặc** build cloud | Mac+Xcode + tài khoản Apple |

**Một công tắc duy nhất cho URL backend:** [`web/config.js`](web/config.js) → `apiBase`
(bản localhost để trống `""`; bản đóng gói đặt qua `API_BASE=… npm run sync`).
appId/appName/màu nền sửa trong [`mobile/capacitor.config.json`](mobile/capacitor.config.json).

---

## 9. Ghi chú vận hành

- **PWA cache**: service worker `web/sw.js` (`ta-store-v18`) — *network-first* cho mã nguồn (`app.js/styles.css`)
  nên đổi code là cập nhật ngay; **bump số version** khi sửa để chắc chắn không phục vụ bản cũ.
- **Python backend**: `server.py` chỉ dùng thư viện chuẩn (chạy mọi `python3`). Website QLBH cần FastAPI/uvicorn —
  dùng venv: `source ~/venv/bin/activate`, `pip install -r QLBH-Website/requirements.txt`, rồi `uvicorn main:app`.
- **Dữ liệu sạch**: muốn xoá đơn/khách kiểm thử → Website → **Quản trị CSDL → Khôi phục dữ liệu gốc**.

## 10. Nhật ký cập nhật (Phiên làm việc gần nhất)

- **Tích hợp Đăng nhập Google (Google Auth)**:
  - Tích hợp chuẩn Google Login cho Capacitor Android và Web.
  - Tự động map ID nhân viên (SA1, SA2...) qua email. Nếu email không được uỷ quyền (không có trong danh sách file `reference.py`), App sẽ báo lỗi "Chưa được cấp quyền" và tự động đăng xuất để bảo vệ dữ liệu nội bộ.
  - Android sử dụng Native Auth thông qua Play Services đảm bảo an toàn tuyệt đối.
- **Nâng cấp Camera & Quét CCCD**:
  - Tích hợp thành công thư viện `jsQR` độc lập thay thế cho `BarcodeDetector`.
  - Hỗ trợ 100% mọi dòng máy Android (kể cả máy đời cũ/khoá hàm mặc định), tốc độ quét siêu mượt.
- **Hệ thống & Tự động hoá**:
  - Di chuyển thành công 100% database lên **Supabase (PostgreSQL)**, loại bỏ giới hạn *database locked* của SQLite.
  - Setup quy trình **GitHub Actions** tự động biên dịch App Android ra file `.apk` mỗi khi push code lên nhánh chính; chứng chỉ ký release cần được cấp qua secret/biến môi trường CI.
- **Báo cáo bán hàng**: Khắc phục các lỗi biểu đồ (tràn biểu đồ khi số quá lớn, crash logic do thiếu component).
- **Giao diện Đối soát kho & Quản lý sản phẩm**: Tách luồng điều chỉnh chuyên biệt, thêm widget popup thao tác siêu nhanh, bổ sung bộ lọc màu thực tế.
