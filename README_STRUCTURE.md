# README cấu trúc dự án và vai trò file

## 1. Đường dẫn dự án

```text
/Users/vetc/Documents/Codex/2026-06-26/c-to-n-b-d-n/storefront
```

Repo GitHub:

```text
https://github.com/viettrungpham23-cloud/storefront
```

Các URL production đang dùng:

```text
Dashboard Netlify: https://tavf.netlify.app
App/PWA trên VM:   http://34.21.152.227:8810
API quản trị VM:   http://34.21.152.227:8000
```

APK mới nhất sau khi fix OAuth:

```text
/Users/vetc/Documents/Codex/2026-06-26/c-to-n-b-d-n/outputs/VinFast_Thu_Anh_App-oauth-fixed.apk
```

## 2. Bức tranh tổng thể

Dự án có 3 lớp chính:

| Lớp | Đường dẫn | Vai trò |
|---|---|---|
| App bán hàng/PWA | `server.py`, `web/`, `catalog.py`, `qlbh_sync.py` | App cho sales/khách: xem xe, giỏ hàng, đặt đơn, đăng nhập Google, đồng bộ đơn sang QLBH. |
| Website quản trị QLBH | `QLBH-Website/` | FastAPI backend quản trị: dashboard, đơn hàng, kho, khách hàng, nhân sự, mua hàng, đối soát. |
| Mobile native wrapper | `mobile/` | Capacitor wrapper để đóng gói web app thành APK Android và scaffold IPA iOS. |

Luồng dữ liệu chính:

```text
web/app.js
  -> server.py (:8810)
  -> qlbh_sync.py
  -> QLBH-Website/database.py + Supabase/PostgreSQL
  -> QLBH-Website/routers/*
  -> admin-dashboard React UI
```

## 3. File root của dự án

| File/thư mục | Vai trò |
|---|---|
| `.github/workflows/build-apk.yml` | GitHub Actions build APK Android. Đọc `STOREFRONT_API_BASE`, `ADMIN_API_BASE` và Android signing secrets để sync web vào Capacitor rồi chạy Gradle. |
| `.gitignore` | Chặn commit file nhạy cảm/sinh tự động như `.env`, DB, `node_modules`, build output. |
| `README.md` | Tài liệu vận hành chính: tính năng, cách chạy, API, đóng gói mobile. |
| `README_STRUCTURE.md` | Tài liệu này: bản đồ cấu trúc và vai trò file. |
| `BAN_GIAO.md` | Tài liệu bàn giao tổng thể: phạm vi nội bộ, bảo mật, database, server, deployment, checklist đóng dự án. |
| `PACKAGING.md` | Hướng dẫn đóng gói PWA/APK/IPA chi tiết. |
| `catalog.py` | Nguồn dữ liệu catalog xe, màu, giá, ưu đãi, phụ kiện/dịch vụ cho app bán hàng. |
| `server.py` | Backend Python stdlib cho app/PWA, port mặc định `8810`; serve `web/` và API giỏ hàng/đơn hàng/sales/thông báo. |
| `qlbh_sync.py` | Cầu nối đồng bộ app bán hàng với database QLBH: tồn kho, khách hàng, đơn, VIN, sales. |
| `netlify.toml` | Cấu hình build/deploy Netlify cho dashboard React, gồm API proxy origin và Google Web OAuth client ID. |
| `download_apk.sh` | Script tiện ích tải APK artifact từ GitHub Actions. |
| `start.command` | Launcher double-click trên macOS để chạy app local. |
| `run-preview.sh` | Script chạy preview/local theo cấu hình dự án. |
| `start_services.sh` | Script start các service local/app liên quan. |
| `restart_services.sh` | Script restart service local. |
| `restart_remote.sh` | Script hỗ trợ restart/deploy service trên server remote. |
| `update_app.sh` | Script cập nhật app/web khi deploy. |

## 4. App bán hàng/PWA: `web/`

| File/thư mục | Vai trò |
|---|---|
| `web/index.html` | HTML entry của PWA/app bán hàng, khai báo Google Sign-In client ID, manifest, CSS, JS. |
| `web/app.js` | SPA chính của app bán hàng: routing màn hình, catalog, giỏ hàng, checkout, login Google, đơn hàng, thông báo. |
| `web/login.js` | Module login tách rời/phiên bản phụ của luồng đăng nhập Google. |
| `web/styles.css` | CSS giao diện app bán hàng/PWA. |
| `web/config.js` | Runtime config của app, đặc biệt `apiBase` và `adminApiBase`; bản APK cũng đóng gói file này. |
| `web/manifest.webmanifest` | Manifest PWA: tên app, icon, màu, display mode. |
| `web/sw.js` | Service worker cache PWA. Cần bump version khi đổi asset quan trọng. |
| `web/render.yaml` | Gợi ý cấu hình deploy Render cho app/backend. |
| `web/assets/logo.png` | Logo app. |
| `web/assets/icon-*.png` | Icon PWA/app ở nhiều kích thước. |
| `web/assets/icon-maskable-512.png` | Icon maskable cho Android/PWA. |
| `web/assets/feliz2-*.png` | Ảnh xe dùng trong catalog/detail UI. |

## 5. Backend quản trị QLBH: `QLBH-Website/`

| File/thư mục | Vai trò |
|---|---|
| `QLBH-Website/main.py` | FastAPI entrypoint, mount routers, tạo bảng, auto-seed user/inventory khi DB trống, health endpoint `/`. |
| `QLBH-Website/database.py` | Khởi tạo SQLAlchemy engine/session, đọc `DATABASE_URL`, kết nối Supabase/PostgreSQL. |
| `QLBH-Website/models.py` | Định nghĩa ORM models: user, inventory, orders, customers, procurement, reconciliation... |
| `QLBH-Website/customer_store.py` | Lưu/đọc file hồ sơ khách hàng, ảnh giấy tờ; endpoint được bảo vệ qua auth. |
| `QLBH-Website/reference.py` | Dữ liệu tham chiếu nội bộ: sales, đơn vị/cơ sở, bảng giá hoặc mapping nghiệp vụ. |
| `QLBH-Website/seed.py` | Nạp dữ liệu ban đầu từ kho/inventory vào database. |
| `QLBH-Website/procurement_seed.py` | Seed dữ liệu mua hàng/nhập hàng. |
| `QLBH-Website/requirements.txt` | Python dependencies cho FastAPI backend. |
| `QLBH-Website/readme.md` | Tài liệu nội bộ riêng của QLBH website. |
| `QLBH-Website/qlbh-database.md` | Ghi chú schema/database logic của QLBH. |
| `QLBH-Website/data/inventory.json` | Dữ liệu tồn kho nguồn dùng để seed/đối chiếu. |

### Routers API

| File | Vai trò |
|---|---|
| `QLBH-Website/routers/__init__.py` | Marker package routers. |
| `QLBH-Website/routers/auth.py` | Google login, verify ID token, phát JWT nội bộ, `get_current_user`, `require_admin`. |
| `QLBH-Website/routers/dashboard.py` | API dashboard: summary, revenue, sales by model/store/segment/channel, tồn kho, đối soát, top customers, recent activity. |
| `QLBH-Website/routers/orders.py` | API danh sách/chi tiết đơn, tạo checkout. |
| `QLBH-Website/routers/admin.py` | API admin: đơn chờ duyệt, verify xe thực tế, VIN available, assign VIN, finalize/edit order. |
| `QLBH-Website/routers/inventory.py` | API kho: list inventory, models, colors, provenance VIN, import hàng hoá bằng CSV (`POST /import-csv`). |
| `QLBH-Website/routers/customers.py` | API khách hàng: list/detail/update, lịch sử mua, parts/services, images/upload. |
| `QLBH-Website/routers/payments.py` | Webhook thanh toán/tín dụng. |
| `QLBH-Website/routers/procurement.py` | Mua hàng/nhập hàng: PO summary/list/detail, suppliers, tạo PO, import receipt. |
| `QLBH-Website/routers/reconciliation.py` | Đối soát/duyệt xuất kho. |
| `QLBH-Website/routers/maintenance.py` | Quản trị CSDL: thống kê, clean/reset dữ liệu theo action. Cần bảo vệ kỹ ở production. |
| `QLBH-Website/routers/users.py` | CRUD nhân sự/user nội bộ. |

## 6. Dashboard React/Vite: `QLBH-Website/admin-dashboard/`

| File/thư mục | Vai trò |
|---|---|
| `package.json` | Scripts/dependencies dashboard: Vite, React, Google OAuth, axios, lucide icons. |
| `package-lock.json` | Khóa version dependency npm. |
| `vite.config.js` | Cấu hình Vite build/dev server. |
| `eslint.config.js` | Cấu hình lint JS/React. |
| `index.html` | HTML entry dashboard. |
| `README.md` | README mặc định/riêng cho dashboard. |
| `.gitignore` | Ignore riêng của dashboard. |
| `public/_redirects` | Redirect/proxy Netlify cho SPA/API. |
| `public/favicon.svg` | Favicon dashboard. |
| `public/icons.svg` | Sprite/icon assets tĩnh. |
| `public/logo.png` | Logo dashboard. |
| `scripts/write-redirects.mjs` | Script build Netlify ghi `dist/_redirects` từ `ADMIN_API_ORIGIN`. |
| `src/main.jsx` | React entry, bọc `GoogleOAuthProvider`. |
| `src/RootApp.jsx` | Root auth gate: đọc token/user trong localStorage, render `Login` hoặc `App`. |
| `src/Login.jsx` | Màn đăng nhập Google dashboard, gửi credential lên backend `/api/v1/auth/google`. |
| `src/App.jsx` | Shell dashboard sau login: sidebar, navigation, layout, logout. |
| `src/api.js` | Axios client, set Authorization token, định nghĩa API methods. |
| `src/App.css` | CSS app shell/dashboard. |
| `src/index.css` | CSS global/base. |
| `src/theme.css` | Design tokens/theme CSS. |
| `src/ui.jsx` | Component UI dùng chung. |
| `src/charts.jsx` | Component chart/visualization dùng trong dashboard. |
| `src/format.js` | Helper format tiền, số, ngày hoặc text. |
| `src/assets/hero.png` | Asset ảnh hero/dashboard. |
| `src/pages/Overview.jsx` | Trang tổng quan điều hành. |
| `src/pages/SalesReport.jsx` | Trang báo cáo bán hàng. |
| `src/pages/Orders.jsx` | Trang quản lý đơn hàng. |
| `src/pages/Inventory.jsx` | Trang quản lý kho. |
| `src/pages/Customers.jsx` | Trang danh sách khách hàng. |
| `src/pages/CustomerDetail.jsx` | Trang chi tiết khách hàng, lịch sử/ảnh/hồ sơ. |
| `src/pages/Procurement.jsx` | Trang mua hàng/nhập kho. |
| `src/pages/Reconciliation.jsx` | Trang đối soát và duyệt. |
| `src/pages/Maintenance.jsx` | Trang quản trị CSDL/maintenance. |
| `src/pages/Users.jsx` | Trang quản lý nhân sự/user. |
| `src/utils/print.js` | Helper render/in biểu mẫu, phiếu hoặc nội dung cần xuất. |

## 7. Mobile wrapper: `mobile/`

| File/thư mục | Vai trò |
|---|---|
| `mobile/package.json` | Scripts Capacitor: sync web, add/open Android/iOS, build APK debug/release. |
| `mobile/package-lock.json` | Khóa version dependency Capacitor. |
| `mobile/capacitor.config.json` | App ID `vn.tainnovation.store`, app name, webDir, GoogleAuth config, cleartext HTTP cho IP hiện tại. |
| `mobile/sync.sh` | Copy `web/` sang `mobile/www`, ghi config API theo env, chạy Capacitor sync. |
| `mobile/.gitignore` | Ignore riêng của mobile. |
| `mobile/assets/*` | Nguồn icon/splash để generate asset Android/iOS. |

### Android: `mobile/android/`

| File/thư mục | Vai trò |
|---|---|
| `mobile/android/build.gradle` | Gradle buildscript cấp project. |
| `mobile/android/settings.gradle` | Include module Android app/Capacitor. |
| `mobile/android/variables.gradle` | Version biến chung cho Android dependencies. |
| `mobile/android/gradle.properties` | Gradle/JVM/AndroidX properties. |
| `mobile/android/gradlew`, `gradlew.bat` | Gradle wrapper scripts. |
| `mobile/android/gradle/wrapper/*` | Gradle wrapper jar/properties. |
| `mobile/android/capacitor.settings.gradle` | Include plugin Capacitor Google Auth. |
| `mobile/android/app/build.gradle` | Android app module: namespace, signing configs từ GitHub Secrets, debug/release build. |
| `mobile/android/app/capacitor.build.gradle` | Capacitor generated build wiring. |
| `mobile/android/app/proguard-rules.pro` | Proguard rules cho release. |
| `mobile/android/app/src/main/AndroidManifest.xml` | Android manifest: activity, permissions, file provider. |
| `mobile/android/app/src/main/java/vn/tainnovation/store/MainActivity.java` | Native MainActivity, register GoogleAuth plugin. |
| `mobile/android/app/src/main/res/values/strings.xml` | App name/package/server client ID cho Google Auth. |
| `mobile/android/app/src/main/res/values/styles.xml` | Android theme/style. |
| `mobile/android/app/src/main/res/values/ic_launcher_background.xml` | Màu nền launcher icon. |
| `mobile/android/app/src/main/res/xml/file_paths.xml` | FileProvider paths. |
| `mobile/android/app/src/main/res/layout/activity_main.xml` | Layout activity chính. |
| `mobile/android/app/src/main/res/drawable*/splash.png` | Splash screen variants theo orientation/density/night mode. |
| `mobile/android/app/src/main/res/mipmap*/ic_launcher*.png/xml` | Launcher icon variants theo density. |
| `mobile/android/app/src/main/res/drawable*/ic_launcher_*.xml` | Vector/background icon resources. |
| `mobile/android/app/src/test/.../ExampleUnitTest.java` | Unit test scaffold Android. |
| `mobile/android/app/src/androidTest/.../ExampleInstrumentedTest.java` | Instrumented test scaffold Android. |

### iOS: `mobile/ios/`

| File/thư mục | Vai trò |
|---|---|
| `mobile/ios/.gitignore` | Ignore riêng iOS. |
| `mobile/ios/App/Podfile` | CocoaPods dependencies iOS. |
| `mobile/ios/App/App.xcodeproj/project.pbxproj` | Xcode project config. |
| `mobile/ios/App/App.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist` | Xcode workspace metadata. |
| `mobile/ios/App/App/AppDelegate.swift` | iOS app delegate scaffold Capacitor. |
| `mobile/ios/App/App/Info.plist` | iOS bundle/config permissions. |
| `mobile/ios/App/App/Base.lproj/LaunchScreen.storyboard` | iOS launch screen. |
| `mobile/ios/App/App/Base.lproj/Main.storyboard` | iOS main storyboard. |
| `mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/*` | App icon iOS. |
| `mobile/ios/App/App/Assets.xcassets/Splash.imageset/*` | Splash images iOS, light/dark, 1x/2x/3x. |
| `mobile/ios/App/App/Assets.xcassets/Contents.json` | Asset catalog metadata. |

## 8. Artifact đã loại khỏi GitHub

| File/thư mục | Lý do loại khỏi repo |
|---|---|
| `looper-close/`, `looper-output/`, `looper-sync/` | Artifact kiểm thử/đánh giá tạm thời, không cần để chạy production. |
| `mobile/Reference/` | Bộ prototype/reference trích xuất, không được runtime import. |
| `QLBH-Website/admin-dashboard/src/assets/react.svg`, `vite.svg` | Asset mặc định của Vite/React scaffold, không dùng trong UI hiện tại. |

Các nhóm trên đã được thêm vào `.gitignore` để không quay lại GitHub trong các lần commit sau.

## 9. Outputs ngoài repo source

Các file bàn giao/build nằm ở:

```text
/Users/vetc/Documents/Codex/2026-06-26/c-to-n-b-d-n/outputs
```

| File | Vai trò |
|---|---|
| `VinFast_Thu_Anh_App-oauth-fixed.apk` | APK Android mới nhất sau khi fix OAuth/signing. |
| `oauth_login_fix_2026-06-27.md` | Nhật ký fix OAuth login, SHA signing, verification. |
| `deployment_handoff_2026-06-27.md` | Ghi chú bàn giao deployment trước đó. |
| Các APK cũ | Artifact lịch sử, chỉ giữ để đối chiếu; nên dùng APK `oauth-fixed`. |

## 10. File không nên commit hoặc cần bảo vệ

| Loại | Ví dụ | Lý do |
|---|---|---|
| Secret/env | `.env`, token, keystore, password | Chứa credential production. |
| DB/runtime data | `*.db`, `customer_db/`, media khách hàng | Có thể chứa PII/CCCD/SĐT/ảnh giấy tờ. |
| Dependency/build output | `node_modules/`, `dist/`, `__pycache__/`, `.gradle/`, `mobile/www/`, `mobile/android/app/build/` | Sinh lại được, nặng, dễ gây lộ dữ liệu hoặc lệch môi trường. |
| Signing material | `*.keystore`, `*.jks`, password files | Chỉ lưu trong GitHub Secrets/secret manager hoặc kho mã hóa của owner. |

## 11. Nơi cần sửa khi thay đổi cấu hình quan trọng

| Muốn đổi | File cần sửa |
|---|---|
| URL API app/PWA/APK | `web/config.js`, hoặc env `API_BASE`/`ADMIN_API_BASE` khi chạy `mobile/sync.sh` và GitHub Actions variables. |
| Google Web OAuth client | `netlify.toml`, `web/index.html`, `mobile/capacitor.config.json`, `mobile/android/app/src/main/res/values/strings.xml`, `QLBH-Website/routers/auth.py`. |
| Android package/app ID | `mobile/capacitor.config.json`, `mobile/android/app/build.gradle`, `mobile/android/app/src/main/res/values/strings.xml`, Google Cloud Android OAuth client. |
| Dashboard API origin trên Netlify | `netlify.toml` (`ADMIN_API_ORIGIN`) và `QLBH-Website/admin-dashboard/scripts/write-redirects.mjs`. |
| DB production | `DATABASE_URL` trong environment/secret, không sửa hardcode trong code. |
| Menu/trang dashboard | `QLBH-Website/admin-dashboard/src/App.jsx` và `src/pages/*`. |
| API nghiệp vụ QLBH | `QLBH-Website/routers/*`, `QLBH-Website/models.py`, `QLBH-Website/database.py`. |
| Catalog app bán hàng | `catalog.py`, `web/app.js`, asset trong `web/assets/`. |

## 12. Lệnh kiểm tra nhanh

```bash
cd /Users/vetc/Documents/Codex/2026-06-26/c-to-n-b-d-n/storefront

# Dashboard build
cd QLBH-Website/admin-dashboard && npm run build

# Python syntax
cd /Users/vetc/Documents/Codex/2026-06-26/c-to-n-b-d-n/storefront
python3 -m py_compile QLBH-Website/routers/auth.py server.py qlbh_sync.py catalog.py

# Public health
curl http://34.21.152.227:8000/
curl http://34.21.152.227:8810/
```
