# Kế hoạch triển khai (Implementation Plan) — Deploy App TA innovation

> Phạm vi: đưa **App bán hàng** (backend `server.py` + SPA `web/`) lên URL HTTPS công khai
> để khách/nhân viên dùng qua PWA hoặc APK. Website QLBH (FastAPI + React) đề cập ở mục 6.

---

## 1. Hiện trạng & mục tiêu

**Hiện trạng:**

| Thành phần | Đang chạy ở đâu | Vấn đề |
|---|---|---|
| App backend (`server.py` :8810) | VPS `34.21.152.227` (nohup qua `restart_remote.sh`) | Chạy HTTP trần, không HTTPS; restart thủ công; không health check |
| Website QLBH (uvicorn :8000) | Cùng VPS | Netlify dashboard gọi về qua `http://` (mixed content khi dashboard chạy HTTPS) |
| Admin dashboard (React) | Netlify (`netlify.toml`) | OK |
| Database | Supabase PostgreSQL | OK — cần `DATABASE_URL` ở mọi nơi chạy backend |

**Mục tiêu:** backend App chạy ở URL **HTTPS** công khai, tự restart khi crash,
có health check, một lệnh deploy; repo tự chứa mọi file cấu hình cần thiết.

---

## 2. Kiến trúc sau deploy

```
Điện thoại (PWA / APK Capacitor)
   │  HTTPS
   ▼
App backend  server.py  (Render/Railway/VPS — HOST=0.0.0.0, PORT do nền tảng cấp)
   │  phục vụ luôn SPA web/ + REST API + /api/auth/guest
   │
   ├── DATABASE_URL ──► Supabase PostgreSQL  (tồn kho, đơn hàng, khách — qua qlbh_sync.py)
   └── store.db (SQLite cục bộ)             (giỏ hàng tạm + guest_users)

Admin dashboard (Netlify) ──► Website QLBH uvicorn :8000 ──► cùng Supabase
```

---

## 3. Các thay đổi trong repo (đã thực hiện ở PR này)

| # | File | Nội dung | Lý do |
|---|---|---|---|
| 1 | `requirements.txt` (mới, gốc repo) | `psycopg2-binary`, `python-dotenv` | Bật đồng bộ Supabase khi deploy; trước đây chỉ QLBH-Website có requirements |
| 2 | `render.yaml` (mới, gốc repo) | Blueprint Render: runtime Python, `python3 server.py`, health check `/api/health` | Deploy 1-click trên Render; thay bản `web/render.yaml` hỏng |
| 3 | `web/render.yaml` (xoá) | — | File cụt (khai `env: docker` nhưng không có Dockerfile) và bị serve công khai như file tĩnh |
| 4 | `Procfile` (mới) | `web: python3 server.py` | Tương thích Railway/Heroku-style |
| 5 | `.env.example` (mới) | Mẫu `DATABASE_URL`, `HOST`, `PORT` | Người deploy biết cần biến gì; `.env` thật đã nằm trong `.gitignore` |
| 6 | `server.py` | Tự nạp `.env` ở gốc repo (nếu có `python-dotenv`); thêm `GET /api/health` | Chạy local/VPS không phải export tay; nền tảng cloud cần endpoint health |

---

## 4. Phương án deploy backend (chọn 1)

### Phương án A — Render.com (khuyên dùng, có HTTPS + auto-restart sẵn)

1. Đăng nhập Render → **New → Blueprint** → trỏ vào repo GitHub này (branch `main` sau khi merge).
   Render tự đọc `render.yaml` ở gốc.
2. Khi được hỏi, điền biến `DATABASE_URL` (chuỗi kết nối Supabase, dạng
   `postgresql://user:pass@host:5432/postgres`). `HOST=0.0.0.0` đã đặt sẵn trong blueprint.
3. Deploy xong nhận URL dạng `https://ta-storefront.onrender.com` → mở thử
   `https://.../api/health` phải trả `{"ok": true, "synced": true}`.
4. **Lưu ý gói free:** service ngủ sau 15 phút không truy cập (lần mở đầu chậm ~30s) và
   **ổ đĩa không bền** — `store.db` (giỏ tạm + guest_users) mất khi redeploy. Chấp nhận được
   vì dữ liệu chính (đơn, khách, kho) nằm trên Supabase; muốn giữ `store.db` thì nâng gói có disk.

### Phương án B — Railway.app

1. **New Project → Deploy from GitHub repo** → Railway tự nhận `Procfile`.
2. Đặt biến: `DATABASE_URL`, `HOST=0.0.0.0` (PORT Railway tự cấp).
3. Settings → Networking → **Generate Domain** để lấy URL HTTPS.

### Phương án C — Giữ VPS hiện tại, chuẩn hoá bằng systemd + Caddy (HTTPS)

Thay `restart_remote.sh` (nohup, chết là hết) bằng service tự hồi phục:

```ini
# /etc/systemd/system/storefront-app.service
[Unit]
Description=TA innovation App backend
After=network.target
[Service]
WorkingDirectory=/home/vetc/storefront
Environment=HOST=127.0.0.1
Environment=PORT=8810
ExecStart=/home/vetc/storefront/venv/bin/python3 server.py
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
```

```
# /etc/caddy/Caddyfile — Caddy tự xin chứng chỉ HTTPS (cần domain trỏ về VPS)
app.ten-mien-cua-ban.vn { reverse_proxy 127.0.0.1:8810 }
admin-api.ten-mien-cua-ban.vn { reverse_proxy 127.0.0.1:8000 }
```

`sudo systemctl enable --now storefront-app` → sống sót qua reboot, tự restart khi crash.
Đồng thời sửa `ADMIN_API_ORIGIN` trong `netlify.toml` sang URL HTTPS mới (hết mixed content).

---

## 5. Sau khi backend có URL HTTPS

1. **Smoke test:** `curl https://<url>/api/health` → `{"ok":true,...}`;
   mở URL trên trình duyệt → đăng nhập khách (họ tên + SĐT) → thêm giỏ → đặt đơn thử.
2. **PWA (nhanh nhất):** gửi URL cho người dùng — iPhone: Safari → *Thêm vào MH chính*;
   Android: Chrome → *Cài đặt ứng dụng*. `web/config.js` giữ `apiBase: ""` vì web + API cùng origin.
3. **APK (Capacitor):**
   ```bash
   cd mobile
   API_BASE="https://<url-backend>" ADMIN_API_BASE="https://<url-qlbh>" bash sync.sh
   npm run apk        # cần JDK 17 + Android SDK, hoặc dùng GitHub Actions "Build Android APK"
   ```
   rồi `./download_apk.sh` tải bản build về (đã có sẵn workflow).
4. **Website QLBH:** deploy `QLBH-Website` (uvicorn) theo cùng phương án A/B/C, đặt cùng
   `DATABASE_URL`; cập nhật `ADMIN_API_ORIGIN` trong `netlify.toml` và `adminApiBase` khi đóng gói mobile.

---

## 6. Biến môi trường

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `DATABASE_URL` | Có (nếu muốn đồng bộ) | — | Chuỗi kết nối Supabase PostgreSQL. Thiếu → App chạy độc lập, `synced:false` |
| `HOST` | Có khi deploy | `127.0.0.1` | Đặt `0.0.0.0` để nhận kết nối ngoài |
| `PORT` | Không | `8810` | Nền tảng cloud thường tự cấp |
| `QLBH_DB` | Không | `QLBH-Website/xe_dien_thu_anh.db` | Chỉ dùng cho chế độ SQLite cũ |

---

## 7. Checklist nghiệm thu

- [ ] `GET /api/health` trả `{"ok": true, "synced": true}` trên URL HTTPS
- [ ] Trang chủ hiển thị 12 xe, tồn kho lấy từ Supabase (`synced: true` trong `/api/catalog`)
- [ ] Đăng nhập khách (họ tên + SĐT) hoạt động trên điện thoại thật
- [ ] Đặt đơn thử → đơn xuất hiện ở màn "Đối soát & Duyệt" của Website QLBH
- [ ] Đóng app rồi mở lại → vẫn đăng nhập (token trong localStorage)
- [ ] Service tự khởi động lại sau khi kill process / reboot (phương án C) hoặc redeploy (A/B)

**Rollback:** Render/Railway giữ lịch sử deploy → bấm *Rollback* về bản trước;
VPS: `git checkout <commit-cũ> && sudo systemctl restart storefront-app`.
