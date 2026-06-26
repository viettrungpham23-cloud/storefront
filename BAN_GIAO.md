# Tài liệu Bàn giao — Hệ sinh thái bán hàng xe điện VinFast Thu Anh

> Phạm vi: **nội bộ đại lý** (nhân viên sales + quản trị). Bàn giao trước khi đóng giai đoạn build.
> Trạng thái hiện tại: **Hoàn chỉnh chức năng**, chạy với Supabase, có xác thực Google Auth cho App.
> Tài liệu này: (1) rà soát cấu trúc lưu file, (2) logic database, (3) bảo mật, (4) định hướng triển khai
> server ổn định, (5) deploy app CH Play/iOS, (6) checklist việc còn lại.

---

## 0. Hai cấu phần & cách chạy

| Cấu phần | Công nghệ | Cổng | Lệnh chạy |
|---|---|---|---|
| **App** (sales/khách) | Python stdlib + SPA `web/` | 8810 | Chạy tự động qua `systemd` (`storefront-app.service`) |
| **Website QLBH** (quản trị) | FastAPI + React/Vite | 8000 / 5173 | Chạy tự động qua `systemd` (`storefront-admin.service`) |

Cả hai ứng dụng đều kết nối thẳng vào cùng một **cơ sở dữ liệu PostgreSQL (Supabase)**. Cầu nối đồng bộ: [`qlbh_sync.py`](qlbh_sync.py).

---

## 1. Rà soát cấu trúc lưu file

```
storefront/
├── server.py · qlbh_sync.py · catalog.py     # MÃ NGUỒN App (Python stdlib)
├── store.db                                   # DỮ LIỆU App: chỉ giỏ hàng tạm thời, bị xóa khi chốt đơn
├── start.command · run-preview.sh             # launcher
├── README.md · PACKAGING.md · BAN_GIAO.md     # tài liệu
├── web/                                        # FRONT-END App (nguồn đóng gói mobile)
│   ├── config.js  (apiBase)  index.html  app.js  styles.css
│   ├── manifest.webmanifest · sw.js (PWA, cache ta-store-v10)
│   └── assets/  (logo, icon-180/192/512/1024, ảnh xe, scooter SVG)
├── mobile/                                     # VỎ NATIVE Capacitor (xuất APK/IPA)
│   ├── capacitor.config.json · sync.sh
│   ├── www/        (bản web đã đóng gói — do sync.sh sinh)
│   ├── android/    (dự án Gradle, có gradlew)   ← APK
│   ├── ios/        (dự án Xcode)                ← IPA
│   └── assets/     (icon/splash nguồn)
├── QLBH-Website/                               # WEBSITE QUẢN TRỊ
│   ├── main.py · database.py · models.py       # MÃ NGUỒN (20 bảng)
│   ├── routers/   (dashboard, orders, inventory, customers, admin,
│   │              payments, procurement, maintenance, reconciliation)
│   ├── reference.py · catalog data             # đơn vị A/B/C + 9 sales, bảng giá
│   ├── seed.py · procurement_seed.py           # nạp dữ liệu từ kho thật
│   ├── customer_store.py                       # kho file hồ sơ khách
│   ├── data/inventory.json                     # KHO THẬT 2.998 VIN (nguồn seed)
│   ├── .env                ⚠                    # DATABASE_URL (URL kết nối Supabase)
│   ├── admin-dashboard/    (React/Vite SPA)     # giao diện quản trị
│   └── start.sh
└── looper-output/ · looper-sync/               # log kiểm thử (Looper) — không cần khi deploy
```

**Phân loại để quản lý:**

| Loại | Mục | Ghi chú khi deploy |
|---|---|---|
| Mã nguồn | `*.py`, `web/`, `admin-dashboard/src/`, `routers/` | Commit Git. |
| Dữ liệu sinh ra | `xe_dien_thu_anh.db`, `store.db`, `customer_db/`, `__pycache__/`, `dist/`, `mobile/www/`, `mobile/android` build | **KHÔNG** commit; backup riêng (DB + customer_db). |
| **Nhạy cảm** | `.env`, `customer_db/media/*` (ảnh CCCD), CCCD trong DB | Phải bảo vệ — xem §3. |
| Tài liệu/test | `*.md`, `looper-*/` | Có thể giữ làm tham khảo. |

> **Cần làm ngay:** thêm `.gitignore` (đang **thiếu** ở gốc) loại trừ:
> `.env`, `*.db`, `customer_db/`, `__pycache__/`, `node_modules/`, `dist/`, `mobile/www/`, `mobile/android/app/build/`.

---

## 2. Logic lưu trữ database

### 2.1 Kiến trúc Cơ sở Dữ liệu
Toàn bộ dữ liệu của hệ thống hiện đã được di chuyển thành công lên **PostgreSQL (Supabase)**. Không còn sử dụng SQLite lưu file cục bộ (ngoại trừ giỏ hàng tạm `store.db` của App).
- Việc sử dụng PostgreSQL giải quyết triệt để rủi ro nghẽn cổ chai (*database locked*) khi có hàng chục nhân viên lên đơn cùng lúc.
- App và Web Admin giao tiếp trực tiếp với Supabase thông qua biến môi trường `DATABASE_URL`.
- **Mã hoá/đồng nhất**: khi lên Postgres, hợp nhất hồ sơ khách vào DB (giữ `customer_db/` chỉ cho ảnh),
  hoặc đưa ảnh lên **object storage** (S3/MinIO) thay vì thư mục cục bộ.
- **Backup**: hiện chỉ là file → cần lịch backup (xem §4.4).

---

## 3. Bảo mật thông tin

### 3.1 Hiện trạng (cần xử lý trước khi dùng thật)

| # | Lỗ hổng hiện tại | Mức | Khắc phục |
|---|---|---|---|
| 1 | **Không có xác thực website admin** | Cao | Thêm đăng nhập (admin), JWT/session; tối thiểu HTTP Basic + HTTPS cho nội bộ (App đã được tích hợp Google Auth) |
| 2 | **CCCD + ảnh giấy tờ lưu plaintext** (DB + `customer_db/media`) | Cao | Mã hoá ở tầng lưu trữ (disk encryption / cột mã hoá), siết quyền thư mục (`chmod 700`), object storage có ACL |
| 3 | `.env` **không** trong `.gitignore`; chưa có quản lý secret | Cao | Thêm `.gitignore`; dùng biến môi trường/secret manager; đổi mọi credential trước prod |
| 4 | `CORS allow_origins=["*"]` (web) + `Access-Control-Allow-Origin: *` (app) | TB | Giới hạn origin theo domain nội bộ khi lên prod |
| 5 | Chạy **HTTP** localhost | Cao | Bắt buộc **HTTPS** (Caddy/nginx + Let's Encrypt) — PWA/iOS cũng yêu cầu |
| 6 | Endpoint **Quản trị CSDL** (`/api/v1/maintenance/clean`) có thao tác **xoá/khôi phục** dữ liệu | Cao | Chặn sau xác thực admin; tắt ở môi trường prod hoặc yêu cầu xác nhận 2 lớp |
| 7 | Chưa có log truy cập / nhật ký thao tác (audit) | TB | Bật access log + ghi nhật ký thao tác nhạy cảm (duyệt đơn, xoá DB) |

### 3.2 Dữ liệu cá nhân (CCCD, ảnh, SĐT)
App thu thập **dữ liệu cá nhân nhạy cảm** (số CCCD, ảnh giấy tờ). Cần tuân thủ
**Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân** (VN):
- **Mục đích & đồng ý**: có thông báo + ô đồng ý của khách trước khi chụp/lưu CCCD.
- **Tối thiểu hoá**: chỉ lưu trường cần; cân nhắc **không lưu ảnh CCNN gốc** sau khi đã đối soát.
- **Lưu trữ có thời hạn** + cơ chế **xoá** theo yêu cầu (đã có nền tảng ở Quản trị CSDL).
- **Phân quyền truy cập**: chỉ sales của đơn + admin được xem hồ sơ/ảnh khách.
- **Mã hoá khi truyền (HTTPS) và khi lưu (at-rest)**.

### 3.3 Phạm vi nội bộ — hệ quả tích cực
Vì **chỉ dùng nội bộ** (không mở public), có thể đơn giản hoá:
- Đặt sau **VPN/IP allowlist** của đại lý → giảm bề mặt tấn công.
- Phân phối app qua **kênh kín** (không cần niêm yết công khai trên store — xem §5).
- Vẫn **bắt buộc** mục 1, 2, 3, 5 ở trên (xác thực, mã hoá CCCD, secret, HTTPS).

---

## 4. Định hướng triển khai server ổn định

### 4.1 Kiến trúc đề xuất (1 VPS nội bộ là đủ giai đoạn đầu)
```
            HTTPS (Caddy/nginx + Let's Encrypt)         [VPN / IP allowlist đại lý]
                      │
   ┌──────────────────┼───────────────────┐
   │                  │                    │
  /app  → App backend   /api/v1 → Website FastAPI    / → React admin (build tĩnh)
   (server.py /         (uvicorn+gunicorn,            (admin-dashboard `npm run build`
    ASGI hoá)            nhiều worker)                 → phục vụ qua nginx)
                      │
                 PostgreSQL  (thay SQLite — 1 nguồn dữ liệu duy nhất)
                      │
                 Backup hằng đêm (DB + ảnh) → off-site
```

### 4.2 Backend App cho production
`server.py` hiện là `ThreadingHTTPServer` (stdlib) — tốt cho dev, **chưa đạt chuẩn prod**
(1 tiến trình, không tự khởi động lại). Lựa chọn:
- **Nhanh:** giữ `server.py`, đặt sau **nginx reverse proxy** + chạy bằng **systemd** (auto-restart) +
  `HOST=0.0.0.0`. Chấp nhận tải nội bộ thấp.
- **Bền hơn (khuyến nghị):** gộp các endpoint App vào **FastAPI** (đã có sẵn cho Website) → một
  codebase, chạy `uvicorn`/`gunicorn` nhiều worker, dùng chung PostgreSQL → bỏ kiểu ghi chung file SQLite.

### 4.3 Website FastAPI cho production
```bash
gunicorn -k uvicorn.workers.UvicornWorker main:app -w 2 -b 127.0.0.1:8000   # sau nginx
```
Dịch vụ chạy bằng **systemd** (auto-restart, log). Build admin: `cd admin-dashboard && npm run build`
→ phục vụ thư mục `dist/` qua nginx (không chạy `vite dev` ở prod). Đặt `VITE_API_BASE` = URL API HTTPS.

### 4.4 Ổn định & sao lưu
- **Process manager**: systemd / supervisor (tự bật lại khi crash, chạy nền).
- **Backup**: `pg_dump` (hoặc copy file `.db` nếu còn SQLite) + `customer_db/` (ảnh) → **hằng đêm**, giữ ≥7 bản, đẩy off-site.
- **Giám sát**: healthcheck `GET /` (Web) & `/api/promo` (App); cảnh báo khi down (Uptime Kuma/cron).
- **Tài nguyên**: VPS 2 vCPU / 2–4 GB RAM là đủ cho vài chục sales nội bộ.

---

## 5. Deploy app lên CH Play / iOS (phạm vi nội bộ)

Quy trình build APK/IPA chi tiết đã có trong [README.md §8](README.md) và [PACKAGING.md](PACKAGING.md).
Vì **dùng nội bộ**, ưu tiên kênh phân phối **kín** (không cần niêm yết công khai):

| Nền tảng | Kênh nội bộ khuyên dùng | Cần gì |
|---|---|---|
| **Android** | (a) Phát **APK trực tiếp** (Drive/MDM) — nhanh nhất · (b) **Google Play → Internal testing/Closed testing** (≤100 tester, không hiển thị công khai) · (c) **Managed Google Play** (qua MDM tổ chức) | Tài khoản Google Play Developer ($25 một lần) cho (b)(c); JDK+SDK hoặc PWABuilder để tạo APK |
| **iOS** | (a) **TestFlight** (nội bộ ≤100 thiết bị, hết hạn 90 ngày/bản) · (b) **Apple Business Manager → Custom Apps** (phân phối riêng cho tổ chức) | **Apple Developer $99/năm** + Mac/Xcode (hoặc build cloud) |
| **Cả hai** | **PWA** — "Thêm vào MH chính" (Safari) / "Cài đặt ứng dụng" (Chrome) | Chỉ cần backend HTTPS — không cần store/tài khoản |

**Khuyến nghị giai đoạn pilot nội bộ:** dùng **PWA** (triển khai tức thì, cập nhật không cần build lại) cho cả 2
hệ; song song chuẩn bị **TestFlight** (iOS) + **Internal testing CH Play** (Android) khi cần app rời/ổn định hơn.

**Trước khi build bản phát hành:** đặt `apiBase` = URL backend **HTTPS production** qua
`API_BASE="https://..." npm run sync` trong `mobile/`; đặt `appId`/icon thương hiệu trong `mobile/capacitor.config.json` + `assets/`.

---

## 6. Checklist việc còn lại (trước khi đóng dự án → vận hành thật)

**Bắt buộc (an toàn dữ liệu):**
- [ ] Thêm `.gitignore` loại trừ `.env`, `*.db`, `customer_db/`, `__pycache__/`, `node_modules/`, `dist/`, `mobile/www/`.
- [ ] Thêm **đăng nhập** cho App (sales) và Website (admin) + **HTTPS**.
- [ ] **Mã hoá / siết quyền** CCCD & ảnh giấy tờ; thêm thông báo + đồng ý theo NĐ 13/2023.
- [ ] Chặn endpoint **Quản trị CSDL** sau xác thực admin.
- [ ] Giới hạn **CORS** theo domain nội bộ.

**Nên làm (ổn định/mở rộng):**
- [ ] systemd + nginx/Caddy + gunicorn workers; build admin tĩnh (`npm run build`).
- [ ] Đưa ảnh lên **object storage** (S3/MinIO) thay thư mục cục bộ.

**Dọn dẹp bàn giao:**
- [ ] **Reseed dữ liệu sạch** trước khi go-live: Website → **Quản trị CSDL → Khôi phục dữ liệu gốc**
      (xoá các đơn/khách kiểm thử `DH0256x`, "KH Test/Sync…").
- [ ] Xoá thư mục test `looper-output/`, `looper-sync/`, `__pycache__/` nếu không cần.
- [ ] Đặt `web/config.js` & `mobile` `apiBase` = URL production.

---

## 7. Cheat-sheet vận hành

```bash
# Chạy song song (dev)
python3 server.py                       # App   :8810
cd QLBH-Website && ./start.sh            # Web    :8000 + admin :5173

# Kiểm tra đồng bộ App↔Web
python3 looper-sync/loop-workspace/checks/sync_check.py     # cần cả 2 server bật

# Làm mới dữ liệu từ kho thật (2.998 VIN)
~/venv/bin/python QLBH-Website/seed.py

# Đóng gói mobile (xem README §8)
cd mobile && API_BASE="https://api-prod..." npm run sync && npm run apk    # Android
```

> Lưu ý môi trường máy dev: `python3` mặc định có thể là 3.14 thiếu uvicorn → backend Website dùng
> `~/venv/bin/python` (có FastAPI/uvicorn). App `server.py` chỉ dùng thư viện chuẩn nên chạy mọi `python3`.

---

*Bàn giao bởi đội phát triển. Mọi mục §6 "Bắt buộc" cần hoàn tất trước khi xử lý dữ liệu khách hàng thật.*
