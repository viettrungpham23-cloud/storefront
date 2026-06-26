# -*- coding: utf-8 -*-
"""
Dữ liệu danh mục cho cửa hàng xe điện TA innovation (Xe Lê Trọng Tấn).
Sản phẩm, màu sắc và tồn kho lấy theo dữ liệu thật trong app/inventory_clean.json,
giá & ưu đãi theo thiết kế "Thu Anh EV iOS App".

3 phân khúc khớp thiết kế:  Đổi pin (3) · Kèm pin (3) · Học sinh (4)
Ưu đãi HOCSINH16: -16% cho toàn bộ xe không cần bằng lái (phân khúc Học sinh).
"""

# Mã ưu đãi đang chạy ----------------------------------------------------------
import calendar
from datetime import datetime as _dt

def _promo_meta():
    now = _dt.now()
    _, last_day = calendar.monthrange(now.year, now.month)
    return {
        "title": f"Ưu đãi học sinh tháng {now.month}/{now.year}",
        "ends_at": f"{now.year}-{now.month:02d}-{last_day:02d}T23:59:59+07:00",
    }

_pm = _promo_meta()
PROMO = {
    "code": "HOCSINH16",
    "pct": 16,
    "title": _pm["title"],
    "subtitle": "Giảm tới 16% toàn bộ dòng xe không cần bằng lái",
    "detail": "Áp dụng cho Amio, Zgoo, Flazz, Evo Grand Lite. "
              "Bảo hành 3 năm, miễn phí lắp ráp tại 3 cơ sở Hà Nội.",
    # đếm ngược kết thúc lúc nửa đêm cuối tháng (giờ VN); FE tự tính "còn lại"
    "ends_at": _pm["ends_at"],
    "segment": "hoc_sinh",   # phân khúc được giảm
}

CATEGORIES = [
    {"key": "all",      "label": "Tất cả",  "subtitle": "Toàn bộ dòng xe điện TA innovation"},
    {"key": "doi_pin",  "label": "Đổi pin", "subtitle": "Trạm đổi pin, không lo chờ sạc"},
    {"key": "kem_pin",  "label": "Kèm pin", "subtitle": "Sở hữu trọn bộ, sạc tại nhà"},
    {"key": "hoc_sinh", "label": "Học sinh","subtitle": "Gọn nhẹ, an toàn, không cần bằng lái."},
]

# Mỗi sản phẩm: giá VND. price_rent chỉ có ở dòng đổi pin (thuê pin).
PRODUCTS = [
    # ───────── ĐỔI PIN ─────────
    {
        "slug": "feliz-ii", "name": "Feliz II", "segment": "doi_pin",
        "tagline": "Xe đổi pin · hiệu năng cao", "needs_license": "A1",
        "speed": 70, "range_km": 85, "battery": "1.5 kWh", "charge": "4h 30p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.8, "reviews": 214, "stock": 115,
        "price_buy": 30500000, "price_rent": 24900000, "promo_pct": 0,
        "badge": "ĐỔI PIN", "featured": True,
        "colors": [
            {"name": "Đỏ Ruby",      "hex": "#e63946"},
            {"name": "Xanh Rêu",     "hex": "#8fae9b"},
            {"name": "Đen Obsidian", "hex": "#1f2937"},
        ],
        "highlights": ["Trạm đổi pin 3 cơ sở Hà Nội", "Cốp rộng 22L", "Phanh đĩa CBS"],
        "description": "Mẫu xe đổi pin mạnh mẽ nhất dải sản phẩm — tốc độ tối đa 70 km/h, "
                       "đi 85 km mỗi lần sạc và đổi pin chỉ trong 2 phút tại các trạm TA innovation.",
    },
    {
        "slug": "feliz-neo", "name": "Feliz Neo", "segment": "doi_pin",
        "tagline": "Đổi pin · đô thị linh hoạt", "needs_license": "Không",
        "speed": 49, "range_km": 75, "battery": "1.4 kWh", "charge": "4h 00p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.6, "reviews": 96, "stock": 42,
        "price_buy": 27000000, "price_rent": 21900000, "promo_pct": 0,
        "badge": "ĐỔI PIN",
        "colors": [
            {"name": "Trắng Pearl", "hex": "#e8eaed"},
            {"name": "Xanh Than",   "hex": "#2b3a55"},
            {"name": "Vàng Cát",    "hex": "#e7b75f"},
        ],
        "highlights": ["Không cần bằng lái", "Khoá thông minh", "Đổi pin 2 phút"],
        "description": "Phiên bản đổi pin gọn nhẹ cho đô thị, dưới 50 km/h nên không cần bằng lái.",
    },
    {
        "slug": "vero-x", "name": "Vero X", "segment": "doi_pin",
        "tagline": "Đổi pin · thể thao", "needs_license": "A1",
        "speed": 78, "range_km": 100, "battery": "1.8 kWh", "charge": "5h 00p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 58, "stock": 43,
        "price_buy": 36900000, "price_rent": 29900000, "promo_pct": 0,
        "badge": "ĐỔI PIN",
        "colors": [
            {"name": "Xám Titan", "hex": "#6b7280"},
            {"name": "Đỏ Ruby",   "hex": "#e63946"},
            {"name": "Đen Mờ",    "hex": "#111827"},
        ],
        "highlights": ["Mô-men xoắn lớn", "Quãng đường 100 km", "Treo trước ống lồng"],
        "description": "Dòng đổi pin thể thao, tăng tốc nhanh và quãng đường tới 100 km mỗi lần sạc.",
    },

    # ───────── KÈM PIN ─────────
    {
        "slug": "evo-grand", "name": "Evo Grand", "segment": "kem_pin",
        "tagline": "Kèm pin · 2 pin đi xa", "needs_license": "A1",
        "speed": 70, "range_km": 110, "battery": "2 × 1.4 kWh", "charge": "6h 00p",
        "battery_warranty": "5 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 322, "stock": 6,
        "price_buy": 28000000, "price_rent": None, "promo_pct": 0,
        "badge": "KÈM PIN", "featured": True,
        "colors": [
            {"name": "Xanh Oliu", "hex": "#6f7a52"},
            {"name": "Trắng",     "hex": "#e8eaed"},
            {"name": "Đỏ",        "hex": "#d23b3b"},
        ],
        "highlights": ["2 pin đi 110 km", "Sạc tại nhà", "Cốp + giá đỡ sau"],
        "description": "Bản kèm 2 pin LFP, đi tới 110 km cho mỗi lần sạc đầy — lựa chọn đường dài.",
    },
    {
        "slug": "feliz-2025", "name": "Feliz 2025", "segment": "kem_pin",
        "tagline": "Kèm pin · quốc dân", "needs_license": "Không",
        "speed": 49, "range_km": 90, "battery": "1.5 kWh", "charge": "6h 00p",
        "battery_warranty": "5 năm", "warranty": "3 năm",
        "rating": 4.6, "reviews": 540, "stock": 38,
        "price_buy": 26500000, "price_rent": None, "promo_pct": 0,
        "badge": "KÈM PIN",
        "colors": [
            {"name": "Xanh Oliu", "hex": "#6f7a52"},
            {"name": "Trắng",     "hex": "#e8eaed"},
            {"name": "Đen",       "hex": "#1f2937"},
        ],
        "highlights": ["Bán chạy nhất", "Không cần bằng lái", "Sạc tại nhà"],
        "description": "Mẫu kèm pin quốc dân, vận hành êm, chi phí thấp, phù hợp mọi thành viên.",
    },
    {
        "slug": "evo", "name": "Evo", "segment": "kem_pin",
        "tagline": "Kèm pin · phổ thông", "needs_license": "Không",
        "speed": 49, "range_km": 80, "battery": "1.3 kWh", "charge": "6h 00p",
        "battery_warranty": "5 năm", "warranty": "3 năm",
        "rating": 4.5, "reviews": 410, "stock": 82,
        "price_buy": 22000000, "price_rent": None, "promo_pct": 0,
        "badge": "KÈM PIN",
        "colors": [
            {"name": "Đỏ",      "hex": "#d23b3b"},
            {"name": "Đen",     "hex": "#1f2937"},
            {"name": "Trắng",   "hex": "#e8eaed"},
        ],
        "highlights": ["Giá hợp lý", "Không cần bằng lái", "Bền bỉ"],
        "description": "Lựa chọn kèm pin phổ thông, chi phí sở hữu thấp cho di chuyển hằng ngày.",
    },

    # ───────── HỌC SINH (không bằng lái, được -16% HOCSINH16) ─────────
    {
        "slug": "amio", "name": "Amio", "segment": "hoc_sinh",
        "tagline": "Học sinh · không bằng lái", "needs_license": "Không",
        "speed": 32, "range_km": 65, "battery": "1.2 kWh", "charge": "4h 00p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 188, "stock": 30,
        "price_buy": 13900000, "price_rent": None, "promo_pct": 16,
        "badge": "KHÔNG BẰNG LÁI", "featured": True,
        "colors": [
            {"name": "Đen Obsidian", "hex": "#1f2937"},
            {"name": "Trắng",        "hex": "#e8eaed"},
            {"name": "Xanh Rêu",     "hex": "#8fae9b"},
        ],
        "highlights": ["Dành cho học sinh", "Tốc độ an toàn 32 km/h", "Nhẹ, dễ điều khiển"],
        "description": "Xe điện cho học sinh: tốc độ giới hạn 32 km/h, không cần bằng lái, "
                       "thân xe nhẹ và dễ kiểm soát.",
    },
    {
        "slug": "flazz", "name": "Flazz", "segment": "hoc_sinh",
        "tagline": "Học sinh · năng động", "needs_license": "Không",
        "speed": 49, "range_km": 70, "battery": "1.3 kWh", "charge": "5h 00p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.6, "reviews": 142, "stock": 24,
        "price_buy": 16900000, "price_rent": None, "promo_pct": 16,
        "badge": "KHÔNG BẰNG LÁI",
        "colors": [
            {"name": "Đen",  "hex": "#1f2937"},
            {"name": "Đỏ",   "hex": "#d23b3b"},
            {"name": "Xám",  "hex": "#6b7280"},
        ],
        "highlights": ["Không cần bằng lái", "49 km/h", "Đèn LED toàn phần"],
        "description": "Xe điện năng động dưới 50 km/h cho học sinh — không cần bằng lái.",
    },
    {
        "slug": "zgoo", "name": "Zgoo", "segment": "hoc_sinh",
        "tagline": "Học sinh · cá tính", "needs_license": "Không",
        "speed": 49, "range_km": 70, "battery": "1.3 kWh", "charge": "5h 00p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.5, "reviews": 110, "stock": 16,
        "price_buy": 15900000, "price_rent": None, "promo_pct": 16,
        "badge": "KHÔNG BẰNG LÁI",
        "colors": [
            {"name": "Đen",   "hex": "#1f2937"},
            {"name": "Xanh",  "hex": "#3b82f6"},
            {"name": "Trắng", "hex": "#e8eaed"},
        ],
        "highlights": ["Không cần bằng lái", "Thiết kế cá tính", "Cốp tiện dụng"],
        "description": "Mẫu xe cá tính cho học sinh, thiết kế trẻ trung, vận hành êm ái.",
    },
    {
        "slug": "evo-grand-lite", "name": "Evo Grand Lite", "segment": "hoc_sinh",
        "tagline": "Học sinh · mới ra mắt", "needs_license": "Không",
        "speed": 49, "range_km": 70, "battery": "1.4 kWh", "charge": "5h 30p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 76, "stock": 18,
        "price_buy": 19900000, "price_rent": None, "promo_pct": 16,
        "badge": "MỚI",
        "colors": [
            {"name": "Xanh Oliu", "hex": "#6f7a52"},
            {"name": "Trắng",     "hex": "#e8eaed"},
            {"name": "Đỏ",        "hex": "#d23b3b"},
        ],
        "highlights": ["Vừa ra mắt", "Không cần bằng lái", "Quãng đường 70 km"],
        "description": "Phiên bản Lite mới ra mắt cho học sinh — quãng đường 70 km, không cần bằng lái.",
    },
]


def price_for(p, option="buy"):
    """Giá gốc theo lựa chọn (buy = mua đứt, rent = thuê pin)."""
    if option == "rent" and p.get("price_rent"):
        return p["price_rent"]
    return p["price_buy"]


def sale_price(base, promo_pct):
    """Giá sau giảm (làm tròn về đồng)."""
    if not promo_pct:
        return base
    return round(base * (100 - promo_pct) / 100)


def public_product(p):
    """Bản rút gọn cho danh sách + tính sẵn giá hiển thị."""
    base = price_for(p, "rent" if p.get("price_rent") else "buy")
    promo = p.get("promo_pct", 0)
    return {
        "slug": p["slug"], "name": p["name"], "segment": p["segment"],
        "tagline": p["tagline"], "needs_license": p["needs_license"],
        "speed": p["speed"], "range_km": p["range_km"], "battery": p["battery"],
        "rating": p["rating"], "reviews": p["reviews"], "stock": p["stock"],
        "badge": p["badge"], "promo_pct": promo, "featured": p.get("featured", False),
        "has_rent": bool(p.get("price_rent")),
        "price_base": base,
        "price_sale": sale_price(base, promo),
        "price_buy": p["price_buy"], "price_rent": p.get("price_rent"),
        "colors": p["colors"],
    }


# ── Mã ưu đãi áp tay (ngoài khuyến mãi học sinh tự áp HOCSINH16) ─────────────
# kind: "percent" (giảm %) | "amount" (giảm tiền). scope: "all" | phân khúc | "addon".
PROMOS = [
    {"code": "GIAM5", "name": "Giảm 5% toàn bộ xe", "kind": "percent", "value": 5,
     "scope": "all", "note": "Áp dụng cho mọi dòng xe."},
    {"code": "TROGIA2TR", "name": "Hỗ trợ giá 2.000.000₫", "kind": "amount", "value": 2_000_000,
     "scope": "all", "note": "Giảm thẳng 2 triệu vào đơn xe."},
    {"code": "DOIPIN15", "name": "Đổi pin −1.500.000₫", "kind": "amount", "value": 1_500_000,
     "scope": "doi_pin", "note": "Chỉ áp dụng dòng Đổi pin."},
    {"code": "KEMPIN3", "name": "Kèm pin giảm 3%", "kind": "percent", "value": 3,
     "scope": "kem_pin", "note": "Chỉ áp dụng dòng Kèm pin."},
    {"code": "PHUKIEN10", "name": "Giảm 10% phụ kiện/dịch vụ", "kind": "percent", "value": 10,
     "scope": "addon", "note": "Áp dụng cho linh kiện & dịch vụ mua kèm."},
]

# ── Linh kiện / dịch vụ giá trị gia tăng mua kèm ───────────────────────────
# type: "accessory" (phụ kiện) | "service" (dịch vụ giá trị gia tăng - VAS).
ADDONS = [
    {"sku": "ADD-THAM", "name": "Thảm để chân cao su", "price": 150_000, "type": "accessory", "icon": "🟫"},
    {"sku": "ADD-MU", "name": "Mũ bảo hiểm chính hãng", "price": 250_000, "type": "accessory", "icon": "🪖"},
    {"sku": "ADD-AOMUA", "name": "Áo mưa bộ in logo", "price": 120_000, "type": "accessory", "icon": "🌧️"},
    {"sku": "ADD-AOPHONG", "name": "Áo phông thương hiệu", "price": 180_000, "type": "accessory", "icon": "👕"},
    {"sku": "ADD-QUAY", "name": "Quây chắn gió/bảo vệ xe", "price": 350_000, "type": "accessory", "icon": "🛡️"},
    {"sku": "VAS-DANXE", "name": "Dịch vụ dán decal/nilon xe", "price": 300_000, "type": "service", "icon": "✨"},
    {"sku": "VAS-DANGKY", "name": "Dịch vụ đăng ký biển số", "price": 1_800_000, "type": "service", "icon": "📋"},
    {"sku": "VAS-BAODUONG", "name": "Gói bảo dưỡng 12 tháng", "price": 600_000, "type": "service", "icon": "🔧"},
]

_ADDON_BY_SKU = {a["sku"]: a for a in ADDONS}
_PROMO_BY_CODE = {p["code"]: p for p in PROMOS}


def find_addon(sku):
    return _ADDON_BY_SKU.get(sku)


def find_promo(code):
    return _PROMO_BY_CODE.get((code or "").strip().upper())
