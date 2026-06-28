# VinFast Thu Anh — Hệ sinh thái Quản lý Bán hàng (App ↔ Website)

Mô hình **toàn diện** từ Ứng dụng khách hàng (App) tới Hệ quản trị trung tâm (Website Admin):
Backend **FastAPI** + Dashboard **React (Vite)**, dữ liệu grounded theo **kho 3.054 xe**.

## 1. Kiến trúc

```
QLBH-Website/
├── main.py            # Lõi FastAPI + CORS + tự seed khi CSDL trống
├── database.py        # Kết nối SQLite (xe_dien_thu_anh.db)
├── models.py          # 13 bảng: kho, khách, đơn, thanh toán, đối soát, công nợ…
├── reference.py       # Bảng giá theo dòng xe, phân khúc, màu, cửa hàng, KM
├── seed.py            # Nạp kho seed + sinh khách/đơn/thanh toán/đối soát
├── data/inventory.json# Kho seed (3.054 số khung, gồm 20 xe/mẫu cho Amio S, Evo Grand Lite, Evo Grand, VeroX)
├── routers/
│   ├── dashboard.py   # API phân tích cho dashboard (KPI, doanh thu, đối soát…)
│   ├── orders.py      # Đơn hàng: danh sách/chi tiết/checkout
│   ├── inventory.py   # Kho theo số khung (VIN) + lọc đa chiều
│   ├── customers.py   # Khách hàng + tổng chi tiêu
│   ├── admin.py       # Đơn chờ xử lý + đối soát số khung (Gatekeeper)
│   └── payments.py    # Webhook ghi nhận dòng tiền → xuất hóa đơn
└── admin-dashboard/   # React + Vite (xem mục 4)
```

## 2. Khởi chạy nhanh (1 lệnh)

```bash
cd QLBH-Website
./start.sh            # tự chọn Python có FastAPI, bật Backend :8000 + Frontend :5173
```

Hoặc chạy thủ công 2 luồng (đúng theo quy trình gốc):

```bash
# Luồng 1 — Backend (FastAPI, cổng 8000)
source ~/venv/bin/activate          # môi trường có fastapi/uvicorn/sqlalchemy
uvicorn main:app --reload           # tài liệu API tự sinh tại http://127.0.0.1:8000/docs

# Luồng 2 — Frontend (React/Vite, cổng 5173)
cd admin-dashboard && npm run dev
```

> CSDL **tự seed** lần chạy đầu (main.py kiểm tra kho trống → gọi seed.py).
> Muốn làm mới dữ liệu: `python seed.py`.

## 3. Mô hình dữ liệu (20 bảng + kho file riêng)

Lõi bán hàng (13 bảng — theo qlbh-database.md):
`stores · customers · product_variants · inventory_items · inventory_logs ·
promotions · accessories · value_added_services · orders · order_details ·
payments · debts · reconciliation_logs`

Mua hàng / Nhập hàng (5 bảng):
`suppliers · purchase_orders · purchase_order_lines · goods_receipts · goods_receipt_items`
(xem `procurement_seed.py`, grounded theo phiếu giao hàng thật PO 5011372342)

Hồ sơ khách hàng (2 bảng): `service_records` (bảo dưỡng) · `part_sales` (linh phụ kiện).

**Kho dữ liệu khách hàng dạng thư mục riêng** (`customer_db/`, xem `customer_store.py`):
- `customer_db/profiles/<id>.json` — hồ sơ KH, **tự động ghi** khi tạo/cập nhật.
- `customer_db/media/<id>/<nhóm>/*.svg` — ảnh đính kèm, **lưu định dạng SVG, chia nhóm**
  (CCCD / VNeID / Xe / Hợp đồng…). Phục vụ tĩnh tại `/customer-files`.

Dữ liệu seed (grounded theo kho vận hành):
- **3.054** số khung (VIN) trên 3 cơ sở **TA1/TA2/TA3** + kho, trạng thái `available/reserved/sold`.
- **2.560** đơn đã bán → **2.346** khách hàng · **2.540** thanh toán · **255** hợp đồng trả góp.
- Doanh thu lũy kế ~**63 tỷ₫**, trải đều 12 tháng để dashboard có xu hướng thật.

## 4. Dashboard bán hàng chuẩn mực (6 màn hình)

| Màn hình | Nội dung |
|---|---|
| **Tổng quan** | 4 KPI (doanh thu tháng/lũy kế, xe bán, tồn kho), biểu đồ doanh thu 12 tháng, hoạt động gần đây, top dòng xe, phân khúc, cơ sở, đối soát, KH VIP |
| **Báo cáo bán hàng** | Doanh thu theo tháng, theo kênh (App/POS/Online), phương thức thanh toán, phân khúc, xếp hạng dòng xe & cơ sở |
| **Mua hàng / Nhập kho** | Đơn đặt từ nhà máy/đại lý: giá trị đặt–đã về–chờ về, aging hàng chưa trả, theo dõi từng lô (phiếu giao hàng), import phiếu → tự sync xe vào kho |
| **Đơn hàng** | Danh sách lọc theo trạng thái/cơ sở + tìm kiếm + phân trang |
| **Đối soát & Duyệt** | Split-screen: danh sách đơn chờ ↔ đối soát số khung thực tế (Gatekeeper), tổng quan dòng tiền |
| **Quản lý kho** | Tồn theo cơ sở, cảnh báo sắp hết, sổ kho theo số khung (VIN) đa bộ lọc |
| **Khách hàng** | Danh sách + nút **Chi tiết** (icon cuối dòng, hover hiện chữ) mở hồ sơ đầy đủ |
| → *Hồ sơ KH* | Biểu mẫu đầy đủ (mã, họ tên, địa chỉ, CCCD, SĐT, email, phân loại, ngày sinh, facebook, zalo, ghi chú) · sửa & lưu vào thư mục riêng |
| → *Mua sắm* | Lịch sử mua xe (thời gian, mẫu mã, số VIN) + **truy xuất nguồn gốc xe** (nhà máy → PO → phiếu giao → kho → bán) |
| → *Linh phụ kiện · Bảo dưỡng* | Lịch sử mua phụ kiện & lịch sử bảo dưỡng (loại DV, số km, KTV, chi phí) |
| → *Hình ảnh* | Upload/chụp ảnh đính kèm → **tự lưu .svg, chia nhóm**; gallery theo nhóm |
| **Quản trị CSDL** | Dọn dẹp & bảo trì localhost: thống kê bảng, chẩn đoán chất lượng dữ liệu, các thao tác làm sạch |

Đồ họa SVG tự dựng (không phụ thuộc thư viện ngoài), font **Be Vietnam Pro**, tông xanh VinFast.

## 5. API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/dashboard/summary` | KPI tổng hợp |
| GET | `/api/v1/dashboard/revenue` · `/sales-by-model` · `/sales-by-store` · `/sales-by-segment` · `/sales-by-channel` · `/payment-methods` · `/inventory-summary` · `/reconciliation` · `/top-customers` · `/recent-activity` | Dữ liệu cho dashboard |
| GET | `/api/v1/orders` · `/api/v1/orders/{order_no}` | Danh sách / chi tiết đơn |
| POST | `/api/v1/orders/checkout` | App chốt đơn → khóa xe `reserved` |
| GET | `/api/v1/inventory` · `/api/v1/customers` | Kho / khách (lọc + phân trang) |
| GET | `/api/v1/admin/pending-orders` | Đơn chờ đối soát |
| PATCH | `/api/v1/admin/orders/{order_no}/verify` | Đối soát số khung thực tế |
| POST | `/api/v1/payments/webhook` | Ghi nhận dòng tiền → xuất hóa đơn → `sold` |
| GET | `/api/v1/maintenance/stats` | Thống kê bảng + chẩn đoán chất lượng dữ liệu |
| POST | `/api/v1/maintenance/clean` | Dọn dẹp CSDL: `{action, confirm}` |
| GET | `/api/v1/procurement/summary` | KPI mua hàng: giá trị đặt/về/chờ, aging, theo nguồn & loại |
| GET | `/api/v1/procurement/orders` · `/orders/{po_no}` | Danh sách / chi tiết PO + các lô giao |
| POST | `/api/v1/procurement/orders` | Tạo đơn đặt hàng mới |
| POST | `/api/v1/procurement/receipts` | Import phiếu giao hàng (lô về) → tự sync xe vào kho |
| GET | `/api/v1/customers/{id}` · `/{id}/purchases` · `/parts` · `/services` · `/images` | Hồ sơ chi tiết & lịch sử |
| PUT | `/api/v1/customers/{id}` | Cập nhật hồ sơ → tự ghi ra `customer_db/` |
| POST | `/api/v1/customers/{id}/images` | Upload ảnh (data URL) → lưu .svg theo nhóm |
| GET | `/api/v1/inventory/provenance/{vin}` | Truy xuất nguồn gốc xe theo số VIN |

Cấu hình địa chỉ backend cho Frontend: biến môi trường `VITE_API_BASE`
(mặc định `http://127.0.0.1:8000`).

### Thao tác dọn dẹp CSDL (màn hình "Quản trị CSDL")

| action | Mô tả | Cần `confirm` |
|---|---|---|
| `remove_future` | Xóa đơn ngày tương lai (nhiễu `date_out`), trả xe về kho | — |
| `remove_orphans` | Gỡ chi tiết/thanh toán/đối soát mồ côi | — |
| `release_reserved` | Đưa xe `reserved` về `available` | — |
| `vacuum` | Tối ưu & nén file SQLite (VACUUM) | — |
| `wipe_transactions` | Xóa đơn/thanh toán/khách, giữ kho & tham chiếu | ✅ |
| `reseed` | Khôi phục toàn bộ từ kho seed (3.054 xe) | ✅ |
| `wipe_all` | Drop & tạo lại mọi bảng (CSDL rỗng) | ✅ |

## 6. Luồng nghiệp vụ App → Website (đa kênh)

```
App: checkout  ──▶  inventory: reserved  ──▶  Admin: verify số khung (vin_verified)
        └────────▶ payments/webhook ──▶ invoice + reconciliation(matched) ──▶ sold
```

Toàn bộ trạng thái này hiển thị realtime trên Dashboard (pipeline đơn, đối soát dòng tiền).

## 7. Mua hàng / Nhập hàng (Procurement)

**Phân loại nguồn:** Nhà máy (`factory`) · Đại lý khác (`dealer`, theo code/tên đại lý).

**Phân loại hàng hóa:**
- `vehicle` — Xe: khi nhập về có VIN / số khung (imei1) / số máy (imei2) → **tự động sync vào kho tồn** (`inventory_items`, status=`available`).
- `vehicle_part` — Linh kiện xe theo đơn nhà máy.
- `accessory` — Phụ kiện đại lý (mũ, áo mưa, thảm, quây… bán/tặng khách).

**Luồng nhập theo lô (đúng thực tế nhà máy trả nhỏ lẻ):**
```
Tạo PO (đặt 100 con, duyệt lệnh)  ──▶  open
        └─ Lô 1 (phiếu giao hàng, 40 con) ─▶ partial ─▶ sync 40 xe vào kho
        └─ Lô 2 (phiếu giao hàng, 5 con)  ─▶ partial ─▶ sync 5 xe vào kho
        └─ … tới khi đủ 100 ────────────────▶ completed
```
- **Kiểm soát giá trị:** tổng đặt = ΣSL × đơn giá; theo dõi giá trị đã về / đang chờ.
- **Aging:** số ngày từ *ngày duyệt lệnh* tới hiện tại cho phần hàng **chưa về**
  (bucket 0–30 / 31–60 / 61–90 / >90; cảnh báo đơn quá hạn >30 ngày).
- **Import phiếu giao hàng:** màn hình "Mua hàng / Nhập kho" → nút *Nhập phiếu giao hàng*
  (dán danh sách VIN), hoặc API `POST /api/v1/procurement/receipts`.
