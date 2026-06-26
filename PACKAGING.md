# Đóng gói & cài đặt lên iPhone / Android

App này là web app (HTML/CSS/JS) + backend Python. Có **3 cách** đưa lên điện thoại,
từ dễ → khó. Vì dữ liệu lấy từ **backend host** nên bước đầu tiên luôn là **deploy backend**.

---

## 0) Deploy backend (BẮT BUỘC cho mọi cách)

Trên điện thoại không có Python, nên API phải chạy ở một URL công khai **HTTPS**
(PWA và iOS chặn HTTP). Backend là Python thuần (không thư viện ngoài) nên chạy được mọi nơi.

Lệnh chạy production:
```bash
HOST=0.0.0.0 PORT=8810 python3 server.py
```
(`HOST=0.0.0.0` để nhận kết nối ngoài; nhiều nền tảng tự cấp `PORT` qua biến môi trường.)

Gợi ý nơi host (chọn 1):
- **Render.com / Railway.app / Fly.io** — tạo service, start command `python3 server.py`,
  để nền tảng tự đặt `PORT`, thêm `HOST=0.0.0.0`. Có HTTPS sẵn.
- **VPS** (bất kỳ) — `HOST=0.0.0.0 python3 server.py`, đặt sau nginx/Caddy để có HTTPS.

> CORS đã mở sẵn (`Access-Control-Allow-Origin: *`) nên app gọi chéo origin được.
> SQLite (`store.db`) là file — nếu nền tảng xoá ổ đĩa khi restart thì gắn volume để giữ đơn hàng.

Sau khi có URL, ví dụ `https://api-tainnovation.onrender.com`, dùng nó ở các bước dưới.

---

## 1) PWA — cài ngay, không cần build (cả iPhone & Android)

Cách nhanh nhất. App đã là PWA (manifest + service worker + icon).

1. Host phần web. Đơn giản nhất: chạy chính `server.py` (nó phục vụ cả web lẫn API) ở một
   URL HTTPS công khai → mở URL đó trên điện thoại. (Khi web và API cùng nơi, để
   `web/config.js` → `apiBase: ""`.)
2. Cài lên màn hình chính:
   - **iPhone (Safari):** nút Chia sẻ → **Thêm vào MH chính** → app chạy toàn màn hình, có icon.
   - **Android (Chrome):** menu ⋮ → **Cài đặt ứng dụng** (hoặc banner “Cài đặt”) → tạo WebAPK có icon.

Ưu: 0 công cụ, 0 tài khoản, cập nhật tức thì.  Nhược: không phải file `.apk/.ipa` rời.

---

## 2) APK (Android) — file cài đặt thật

### Cách A — Build tại máy (Capacitor, đã scaffold sẵn trong `mobile/`)
Cần cài: **JDK 17** + **Android SDK** (qua Android Studio là gọn nhất). *(Máy này hiện chưa có.)*

```bash
cd storefront/mobile
# 1) nhúng URL backend vào bản đóng gói rồi đồng bộ:
API_BASE="https://api-cua-ban.example.com" bash sync.sh
# 2) (tuỳ chọn) tạo icon/splash thương hiệu từ assets/:
npx @capacitor/assets generate --android
# 3) build APK debug (cài thử cá nhân):
npm run apk
#    → file: android/app/build/outputs/apk/debug/app-debug.apk
```
Chép `app-debug.apk` sang điện thoại (USB/Drive/Zalo), bật **Cài từ nguồn không xác định** → cài.

APK release đã ký (để chia sẻ rộng): tạo keystore rồi `npm run apk:release` (xem docs Capacitor/Android signing).

> Trạng thái hiện tại: `mobile/` đã `npm install` xong và đã `npx cap add android`
> → thư mục `mobile/android/` (dự án Gradle) **đã sẵn sàng**, chỉ thiếu JDK+SDK để bấm build.

### Cách B — Không cài công cụ: PWABuilder (khuyên dùng nếu ngại toolchain)
1. Host PWA (mục 1) ở URL HTTPS.
2. Vào **https://www.pwabuilder.com**, dán URL.
3. Chọn **Android → Generate** → tải về **APK đã ký** (cài được luôn) + bản AAB cho CH Play.

---

## 3) IPA (iPhone) — ràng buộc của Apple

**Không thể** tạo & cài `.ipa` tự do như Android. Bắt buộc:
- Một máy **Mac có Xcode** (máy này hiện **chưa có Xcode**, chỉ có Command Line Tools), và
- **CocoaPods** (`sudo gem install cocoapods`), và
- Tài khoản Apple:
  - **Apple ID miễn phí** → chạy lên đúng iPhone của bạn nhưng app **hết hạn sau 7 ngày**.
  - **Apple Developer trả phí ($99/năm)** → cài lâu dài / TestFlight / App Store.

Các bước (trên Mac có Xcode):
```bash
cd storefront/mobile
API_BASE="https://api-cua-ban.example.com" bash sync.sh
sudo gem install cocoapods          # nếu chưa có
npx cap add ios                     # (đã tạo sẵn ios/, lệnh này sẽ chạy pod install)
npx @capacitor/assets generate --ios   # icon/splash (tuỳ chọn)
npx cap open ios                    # mở Xcode
```
Trong Xcode: chọn Team (Apple ID), cắm iPhone → **Run** để cài thử;
hoặc **Product → Archive → Distribute** để xuất `.ipa`.

> Dự án `ios/` (Xcode) đã được scaffold trong `mobile/ios/`. Chỉ cần mở trên Mac có Xcode để hoàn tất.

Không có Mac/Xcode? Dùng dịch vụ build cloud cho iOS:
- **Ionic Appflow**, **Codemagic**, **EAS Build** — build IPA trên cloud (vẫn cần tài khoản Apple để ký).
- Hoặc cứ dùng **PWA** cho iPhone (mục 1) — cài được ngay, không cần Apple Developer.

---

## Tóm tắt nhanh

| Mục tiêu | Cách | Cần gì |
|---|---|---|
| Lên cả 2 máy NGAY | PWA (mục 1) | Chỉ cần host backend HTTPS |
| File `.apk` | Capacitor `npm run apk` **hoặc** PWABuilder | JDK+SDK **hoặc** chỉ URL |
| File `.ipa` | Capacitor + Xcode **hoặc** build cloud | Mac+Xcode + tài khoản Apple |

**Một công tắc duy nhất cho URL backend:** `web/config.js` → `apiBase`
(bản localhost để trống; bản đóng gói đặt URL host qua `API_BASE=… bash sync.sh`).
