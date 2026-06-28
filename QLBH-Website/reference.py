"""
Dữ liệu tham chiếu để grounding cho seed: bảng giá theo dòng xe, phân khúc,
mã màu, danh sách cơ sở, khuyến mại, phụ kiện/VAS và bộ sinh tên khách hàng VN.

Giá cơ sở: ưu tiên theo catalog của App (storefront/catalog.py) và giá niêm yết
KiotViet quan sát được; các dòng ngoài catalog dùng giá bán lẻ VinFast hợp lý.
"""

# Giá cơ sở theo dòng xe (VNĐ). Khóa = model viết HOA như trong inventory thật.
MODEL_PRICE = {
    "FELIZ II": 30_500_000,
    "EVO MAX": 25_600_000,
    "FELIZ NEO": 27_000_000,
    "FELIZ 2025": 27_900_000,
    "FELIZ LITE": 24_000_000,
    "VEROX": 34_900_000,
    "VERO X": 34_900_000,
    "EVO GRAND": 23_900_000,        # theo niêm yết KiotViet
    "EVO GRAND +1": 24_900_000,     # bản kèm pin phụ
    "EVO GRAND LITE": 19_900_000,
    "EVO GRAND LITE +1": 20_900_000,
    "EVO": 22_000_000,
    "EVO 200 LITE": 22_000_000,
    "EVO LITE": 22_600_000,
    "EVO LITE NEO": 21_500_000,
    "AMIO": 13_900_000,
    "AMIO S": 13_900_000,
    "FLAZZ": 16_900_000,
    "FLAZZ MAX": 20_600_000,
    "ZGOO": 15_900_000,
    "MOTIO": 18_000_000,
    "VIPER": 45_500_000,
    "KLARA": 40_000_000,
    "VENTO NEO 2025": 50_000_000,
    "THEON": 64_900_000,
    "VENTO": 50_000_000,
}
DEFAULT_PRICE = 25_000_000

# Phân khúc theo dòng xe (khớp App: doi_pin / kem_pin / hoc_sinh)
MODEL_SEGMENT = {
    "FELIZ II": "doi_pin", "EVO MAX": "doi_pin", "FELIZ NEO": "doi_pin",
    "VIPER": "doi_pin", "THEON": "doi_pin", "KLARA": "doi_pin",
    "VENTO NEO 2025": "doi_pin", "VENTO": "doi_pin",
    "EVO LITE": "doi_pin", "FLAZZ MAX": "doi_pin",
    "FELIZ 2025": "kem_pin", "FELIZ LITE": "kem_pin",
    "EVO GRAND": "kem_pin", "EVO GRAND +1": "kem_pin", "VEROX": "kem_pin", "VERO X": "kem_pin",
    "EVO": "kem_pin", "EVO 200 LITE": "kem_pin",
    "EVO LITE NEO": "kem_pin", "MOTIO": "kem_pin",
    "AMIO": "hoc_sinh", "AMIO S": "hoc_sinh", "FLAZZ": "hoc_sinh", "ZGOO": "hoc_sinh",
    "EVO GRAND LITE": "hoc_sinh", "EVO GRAND LITE +1": "hoc_sinh",
}


def price_of(model: str) -> int:
    return MODEL_PRICE.get((model or "").strip().upper(), DEFAULT_PRICE)


def segment_of(model: str) -> str:
    return MODEL_SEGMENT.get((model or "").strip().upper(), "kem_pin")


# Mã màu (đoán theo tên màu tiếng Việt -> hex để dashboard hiển thị chip)
COLOR_HEX = {
    "đỏ": "#e63946", "đỏ ruby": "#e63946", "ruby": "#e63946",
    "xanh": "#2563eb", "xanh dương": "#2563eb", "xanh than": "#1e3a5f",
    "xanh rêu": "#6f7a52", "xanh oliu": "#6f7a52", "xanh lá": "#10b981",
    "đen": "#1f2937", "đen obsidian": "#111827", "đen mờ": "#111827",
    "trắng": "#e8eaed", "trắng pearl": "#eef1f4",
    "vàng": "#e7b75f", "vàng cát": "#e7b75f",
    "xám": "#6b7280", "xám titan": "#6b7280", "bạc": "#c0c4cc",
    "hồng": "#ec4899", "cam": "#f97316", "nâu": "#92400e", "tím": "#8b5cf6",
}


def color_hex(name: str) -> str:
    n = (name or "").strip().lower()
    if n in COLOR_HEX:
        return COLOR_HEX[n]
    for key, hexv in COLOR_HEX.items():
        if key in n:
            return hexv
    return "#94a3b8"


# Cơ sở / cửa hàng
STORES = [
    {"store_id": "TA1", "name": "Thu Anh 1 (TA1)", "address": "Cơ sở Cầu Giấy, Hà Nội", "is_warehouse": 0},
    {"store_id": "TA2", "name": "Thu Anh 2 (TA2)", "address": "Cơ sở Hà Đông, Hà Nội", "is_warehouse": 0},
    {"store_id": "TA3", "name": "Thu Anh 3 (TA3)", "address": "Cơ sở Long Biên, Hà Nội", "is_warehouse": 0},
    {"store_id": "KHO", "name": "Tổng kho", "address": "Kho trung tâm", "is_warehouse": 1},
    {"store_id": "KHAC", "name": "Khác / Đại lý ngoài", "address": "Đối tác ngoài hệ thống", "is_warehouse": 0},
]

# Khuyến mại đang chạy
PROMOTIONS = [
    {"promo_code": "HOCSINH16", "name": "Ưu đãi học sinh −16%", "discount_value": 0,
     "discount_pct": 16, "sponsor": "Hãng VinFast", "expired_at": "2026-12-31"},
    {"promo_code": "TROGIA3TR", "name": "Hỗ trợ giá 3.000.000₫", "discount_value": 3_000_000,
     "discount_pct": 0, "sponsor": "Đại lý Thu Anh", "expired_at": "2026-09-30"},
    {"promo_code": "PINFREE12", "name": "Miễn phí thuê pin 12 tháng", "discount_value": 1_200_000,
     "discount_pct": 0, "sponsor": "Hãng VinFast", "expired_at": "2026-08-31"},
]

# Phụ kiện
ACCESSORIES = [
    {"part_sku": "ACC-COP", "name": "Cốp xe nhựa nguyên sinh", "price": 500_000, "stock_quantity": 120},
    {"part_sku": "ACC-NILON", "name": "Dán nilon/decal bảo vệ", "price": 300_000, "stock_quantity": 200},
    {"part_sku": "ACC-MU", "name": "Mũ bảo hiểm chính hãng", "price": 250_000, "stock_quantity": 300},
    {"part_sku": "ACC-SAC", "name": "Bộ sạc nhanh dự phòng", "price": 1_500_000, "stock_quantity": 60},
]

# Dịch vụ giá trị gia tăng
VAS = [
    {"service_code": "VAS-BHVC", "service_name": "Bảo hiểm vật chất xe", "fee": 1_000_000},
    {"service_code": "VAS-DKX", "service_name": "Dịch vụ đăng ký biển số", "fee": 1_800_000},
    {"service_code": "VAS-BD12", "service_name": "Gói bảo dưỡng 12 tháng", "fee": 600_000},
]

# Đối tác tài chính (BNPL / trả góp)
FIN_PARTNERS = ["TPBank", "HomeCredit", "FE Credit", "Mcredit"]

PAYMENT_METHODS = ["Tiền mặt", "Chuyển khoản", "POS", "BNPL"]

# Bộ sinh tên khách hàng Việt Nam
HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng",
      "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Mai", "Trịnh"]
DEM = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Quang", "Thanh", "Hồng",
       "Ngọc", "Thu", "Gia", "Bảo", "Anh", "Tuấn", "Khánh", "Phương"]
TEN = ["An", "Bình", "Cường", "Dũng", "Giang", "Hà", "Hải", "Hùng",
       "Hương", "Lan", "Linh", "Long", "Mai", "Nam", "Nga", "Ngọc",
       "Phong", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Trung", "Tú",
       "Vân", "Việt", "Yến", "Đạt", "Hiếu", "Khoa", "Loan", "Phúc"]

DISTRICTS = ["Cầu Giấy", "Đống Đa", "Hai Bà Trưng", "Hà Đông", "Long Biên",
             "Thanh Xuân", "Hoàng Mai", "Nam Từ Liêm", "Bắc Từ Liêm",
             "Tây Hồ", "Ba Đình", "Gia Lâm", "Đông Anh", "Hoàn Kiếm"]

# ── Đơn vị (A/B/C) ↔ cơ sở (TA1/TA2/TA3) ────────────────────────────────────
UNITS = [
    {"code": "A", "name": "Đơn vị A", "store": "TA1", "store_name": "Thu Anh 1 — Cầu Giấy"},
    {"code": "B", "name": "Đơn vị B", "store": "TA2", "store_name": "Thu Anh 2 — Hà Đông"},
    {"code": "C", "name": "Đơn vị C", "store": "TA3", "store_name": "Thu Anh 3 — Long Biên"},
]
UNIT_BY_STORE = {u["store"]: u for u in UNITS}

# ── Nhân viên Sales: mỗi đơn vị 3 người (sales 1/2/3) ───────────────────────
_SALES_NAMES = {
    "A": ["Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Cường"],
    "B": ["Phạm Minh Đức", "Hoàng Thị Em", "Vũ Quang Phú"],
    "C": ["Đặng Văn Giang", "Bùi Thị Hoa", "Đỗ Minh Khôi"],
}
SALES = []
for _u in UNITS:
    for _i, _nm in enumerate(_SALES_NAMES[_u["code"]], start=1):
        SALES.append({
            "id": f"S{_u['code']}{_i}",                 # SA1, SA2, SA3, SB1…
            "name": _nm,
            "seq": _i,                                   # sales 1/2/3 trong đơn vị
            "unit": _u["code"], "unit_name": _u["name"],
            "store": _u["store"], "store_name": _u["store_name"],
            "role": "Trưởng nhóm kinh doanh" if _i == 1 else "Nhân viên kinh doanh",
            "phone": f"0987{ord(_u['code'])}{_i}0{_i}{ord(_u['code']) % 10}",
            "email": f"sales{_u['code'].lower()}{_i}@vinfastthuanh.vn",
            "target": 30,                                # chỉ tiêu xe/tháng
        })
SALES_BY_ID = {s["id"]: s for s in SALES}
SALES_BY_STORE = {}
for _s in SALES:
    SALES_BY_STORE.setdefault(_s["store"], []).append(_s)
