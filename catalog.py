# -*- coding: utf-8 -*-
"""
Dữ liệu danh mục cho cửa hàng xe điện TA innovation (Xe Lê Trọng Tấn).
Sản phẩm, màu sắc & giá theo thiết kế "Thu Anh EV iOS App"; tồn kho (stock) đồng
bộ động từ kho QLBH thật (QLBH-Website/data/inventory.json) qua apply_inventory_stock().

Nguồn bảng giá hiện hành: BangGia_PhanTich_VinFast_ThuAnh.xlsx.

3 nhóm hàng hóa chính: Đổi pin · Kèm pin · Học sinh.
Chỉ nhóm Đổi pin có hai lựa chọn giá: Thuê pin và Mua đứt pin.
"""

# Mã ưu đãi đang chạy ----------------------------------------------------------
import calendar
import json
from datetime import datetime as _dt
from pathlib import Path

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
    "detail": "Áp dụng cho Flazz, Zgoo, Evo Grand Lite, Amio S và các mẫu học sinh/không cần bằng lái theo bảng giá. "
              "Bảo hành 3 năm, miễn phí lắp ráp tại 3 cơ sở Hà Nội.",
    # đếm ngược kết thúc lúc nửa đêm cuối tháng (giờ VN); FE tự tính "còn lại"
    "ends_at": _pm["ends_at"],
    "segment": "hoc_sinh",   # phân khúc được giảm
}

AUTO_PROMO = {
    "code": "KM_BANG_GIA",
    "title": "Khuyến mại theo bảng giá",
    "subtitle": "Tự động áp dụng đúng mức KM 8% hoặc 16% theo từng dòng xe.",
}

CATEGORIES = [
    {"key": "all",      "label": "Tất cả",  "subtitle": "Toàn bộ dòng xe điện TA innovation"},
    {"key": "doi_pin",  "label": "Đổi pin", "subtitle": "Trạm đổi pin, không lo chờ sạc"},
    {"key": "kem_pin",  "label": "Kèm pin", "subtitle": "Sở hữu trọn bộ, sạc tại nhà"},
    {"key": "hoc_sinh", "label": "Học sinh","subtitle": "Gọn nhẹ, an toàn, không cần bằng lái."},
]

# Mỗi sản phẩm: giá VND. price_rent chỉ có ở dòng đổi pin (thuê pin).
# specs bám theo các cột kỹ thuật trong workbook.
PRODUCTS = [
    {
        "slug": "feliz-ii", "name": "Feliz II", "segment": "doi_pin",
        "segments": ["doi_pin"], "category_label": "Xe đổi pin",
        "tagline": "Đổi pin · linh hoạt tại tủ", "needs_license": "Cần bằng (A1)",
        "speed": 70, "range_km": 85, "battery": "1.5 kWh", "charge": "4h30p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.8, "reviews": 214, "stock": 115,
        "price_buy": 30_500_000, "price_rent": 24_900_000, "promo_pct": 8,
        "badge": "ĐỔI PIN", "status": "Đang bán", "featured": True,
        "inventory_names": ["FELIZ II"],
        "colors": [
            {"name": "Đỏ Ruby",      "hex": "#e63946"},
            {"name": "Xanh Rêu",     "hex": "#8fae9b"},
            {"name": "Đen Obsidian", "hex": "#1f2937"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Có", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "100kg",
            "power": "3000W", "dimensions": "1920 x 694 x 1140 mm",
        },
        "highlights": ["Thuê pin hoặc mua đứt", "Đổi pin linh hoạt tại tủ", "Tốc độ 70 km/h"],
        "description": "Dòng xe máy điện thế hệ mới, sử dụng pin thay đổi linh hoạt tại tủ.",
    },
    {
        "slug": "evo-max", "name": "Evo Max", "segment": "doi_pin",
        "segments": ["doi_pin"], "category_label": "Xe đổi pin",
        "tagline": "Đổi pin · đô thị mạnh mẽ", "needs_license": "Cần bằng (A1)",
        "speed": 70, "range_km": 85, "battery": "1.5 kWh", "charge": "4h30p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 126, "stock": 48,
        "price_buy": 25_600_000, "price_rent": 19_990_000, "promo_pct": 8,
        "badge": "ĐỔI PIN", "status": "Đang bán", "featured": True,
        "inventory_names": ["EVO MAX"],
        "colors": [
            {"name": "Xanh Than", "hex": "#2b3a55"},
            {"name": "Trắng", "hex": "#e8eaed"},
            {"name": "Đen", "hex": "#1f2937"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Có", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "86kg",
            "power": "2450W", "dimensions": "1856 x 683 x 1133mm",
        },
        "highlights": ["Giá thuê pin dễ tiếp cận", "Pin 1.5 kWh", "Quãng đường 85 km/sạc"],
        "description": "Dòng xe máy điện thế hệ mới, sử dụng pin thay đổi linh hoạt tại tủ.",
    },
    {
        "slug": "viper", "name": "Viper", "segment": "doi_pin",
        "segments": ["doi_pin"], "category_label": "Xe đổi pin",
        "tagline": "Đổi pin · kiểu dáng thể thao", "needs_license": "Cần bằng (A1)",
        "speed": 70, "range_km": 85, "battery": "1.5 kWh", "charge": "4h30p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.8, "reviews": 88, "stock": 21,
        "price_buy": 45_500_000, "price_rent": 39_900_000, "promo_pct": 8,
        "badge": "ĐỔI PIN", "status": "Đang bán",
        "inventory_names": ["VIPER"],
        "colors": [
            {"name": "Đỏ Ruby", "hex": "#e63946"},
            {"name": "Đen Mờ", "hex": "#111827"},
            {"name": "Xám Titan", "hex": "#6b7280"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Có", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Smartkey", "weight": "100kg",
            "power": "3000W", "dimensions": "1907 x 692 x 1135 mm",
        },
        "highlights": ["Smartkey", "Kiểu dáng thể thao", "Thuê pin hoặc mua đứt"],
        "description": "Dòng xe máy điện thế hệ mới, sử dụng pin thay đổi linh hoạt tại tủ, kiểu dáng thể thao.",
    },
    {
        "slug": "evo-lite", "name": "Evo Lite", "segment": "doi_pin",
        "segments": ["doi_pin"], "category_label": "Xe đổi pin",
        "tagline": "Đổi pin · không cần bằng lái", "needs_license": "Không cần",
        "speed": 49, "range_km": 85, "battery": "1.5 kWh", "charge": "4h30p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.6, "reviews": 152, "stock": 34,
        "price_buy": 22_600_000, "price_rent": 17_000_000, "promo_pct": 16,
        "badge": "ĐỔI PIN", "status": "Đang bán",
        "inventory_names": ["EVO LITE"],
        "colors": [
            {"name": "Trắng", "hex": "#e8eaed"},
            {"name": "Xanh", "hex": "#2563eb"},
            {"name": "Đen", "hex": "#1f2937"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Có", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "86kg",
            "power": "2300W", "dimensions": "1856 x 683 x 1133mm",
        },
        "highlights": ["Không cần bằng lái", "KM 16%", "Đổi pin linh hoạt"],
        "description": "Xe máy điện dành cho học sinh, kiểu dáng thời trang.",
    },
    {
        "slug": "flazz-max", "name": "Flazz Max", "segment": "doi_pin",
        "segments": ["doi_pin", "hoc_sinh"], "category_label": "Xe học sinh, xe đổi pin",
        "tagline": "Học sinh · đổi pin linh hoạt", "needs_license": "Không cần",
        "speed": 49, "range_km": 85, "battery": "1.5 kWh", "charge": "4h30p",
        "battery_warranty": "8 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 116, "stock": 26,
        "price_buy": 20_600_000, "price_rent": 14_990_000, "promo_pct": 16,
        "badge": "ĐỔI PIN + HS", "status": "Đang bán", "featured": True,
        "inventory_names": ["FLAZZ MAX"],
        "colors": [
            {"name": "Đen", "hex": "#1f2937"},
            {"name": "Đỏ", "hex": "#d23b3b"},
            {"name": "Xám", "hex": "#6b7280"},
        ],
        "specs": {
            "aux_battery": "Không", "esim": "Có", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "86kg",
            "power": "1500W", "dimensions": "1745 x 700 x 1050 mm",
        },
        "highlights": ["Học sinh + đổi pin", "KM 16%", "Không cần bằng lái"],
        "description": "Xe máy điện dành cho học sinh, kiểu dáng thời trang, có thể đổi pin linh hoạt.",
    },

    # ───────── KÈM PIN ─────────
    {
        "slug": "feliz-2025", "name": "Feliz 2025", "segment": "kem_pin",
        "segments": ["kem_pin"], "category_label": "Xe kèm pin",
        "tagline": "Kèm pin · dung lượng lớn", "needs_license": "Cần bằng (A1)",
        "speed": 70, "range_km": 134, "battery": "2.4 kWh", "charge": "6h30p",
        "battery_warranty": "5 năm", "warranty": "3 năm",
        "rating": 4.8, "reviews": 540, "stock": 38,
        "price_buy": 27_900_000, "price_rent": None, "promo_pct": 8,
        "badge": "KÈM PIN", "status": "Đang bán",
        "inventory_names": ["FELIZ 2025"],
        "colors": [
            {"name": "Xanh Oliu", "hex": "#6f7a52"},
            {"name": "Trắng",     "hex": "#e8eaed"},
            {"name": "Đen",       "hex": "#1f2937"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Không", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "100kg",
            "power": "2800W", "dimensions": "1920 x 694 x 1140 mm",
        },
        "highlights": ["Trọn giá kèm pin", "Pin 2.4 kWh", "Có thể nâng cấp pin phụ"],
        "description": "Dòng xe máy điện dung tích pin lớn 2.4kWh, có khả năng nâng cấp pin phụ nâng tổng quãng đường đi được ~200km.",
    },
    {
        "slug": "evo-grand", "name": "Evo Grand", "segment": "kem_pin",
        "segments": ["kem_pin"], "category_label": "Xe kèm pin",
        "tagline": "Kèm pin · đi xa", "needs_license": "Cần bằng (A1)",
        "speed": 70, "range_km": 134, "battery": "2.4 kWh", "charge": "6h30p",
        "battery_warranty": "5 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 322, "stock": 42,
        "price_buy": 23_900_000, "price_rent": None, "promo_pct": 8,
        "badge": "KÈM PIN", "status": "Đang bán", "featured": True,
        "inventory_names": ["EVO GRAND"],
        "colors": [
            {"name": "Xanh Oliu", "hex": "#6f7a52"},
            {"name": "Trắng",     "hex": "#e8eaed"},
            {"name": "Đỏ",        "hex": "#d23b3b"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Không", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "100kg",
            "power": "2250W", "dimensions": "1856 x 683 x 1133mm",
        },
        "highlights": ["Trọn giá kèm pin", "Quãng đường 134 km/sạc", "Có thể nâng cấp pin phụ"],
        "description": "Dòng xe máy điện dung tích pin lớn 2.4kWh, có khả năng nâng cấp pin phụ nâng tổng quãng đường đi được ~200km.",
    },
    {
        "slug": "verox", "name": "VeroX", "segment": "kem_pin",
        "segments": ["kem_pin"], "category_label": "Xe kèm pin",
        "tagline": "Kèm pin · đã ngừng kinh doanh", "needs_license": "Cần bằng (A1)",
        "speed": 70, "range_km": 134, "battery": "2.4 kWh", "charge": "6h30p",
        "battery_warranty": "5 năm", "warranty": "3 năm",
        "rating": 4.5, "reviews": 58, "stock": 0,
        "price_buy": 34_900_000, "price_rent": None, "promo_pct": 8,
        "badge": "NGỪNG KD", "status": "Ngừng KD",
        "inventory_names": ["VEROX", "VERO X"],
        "colors": [
            {"name": "Xám Titan", "hex": "#6b7280"},
            {"name": "Đen", "hex": "#1f2937"},
            {"name": "Trắng", "hex": "#e8eaed"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Không", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "100kg",
            "power": "2250W", "dimensions": "1858 x 690 x 1100 mm",
        },
        "highlights": ["Trọn giá kèm pin", "Pin 2.4 kWh", "Ngừng kinh doanh"],
        "description": "Dòng xe máy điện dung tích pin lớn 2.4kWh, có khả năng nâng cấp pin phụ nâng tổng quãng đường đi được ~200km.",
    },

    # ───────── HỌC SINH (không bằng lái, được -16% HOCSINH16) ─────────
    {
        "slug": "flazz", "name": "Flazz", "segment": "hoc_sinh",
        "segments": ["hoc_sinh"], "category_label": "Xe học sinh",
        "tagline": "Học sinh · thời trang", "needs_license": "Không cần",
        "speed": 49, "range_km": 70, "battery": "1.2 kWh", "charge": "6h30p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.6, "reviews": 142, "stock": 24,
        "price_buy": 16_900_000, "price_rent": None, "promo_pct": 16,
        "badge": "HỌC SINH", "status": "Đang bán",
        "inventory_names": ["FLAZZ"],
        "colors": [
            {"name": "Đen",  "hex": "#1f2937"},
            {"name": "Đỏ",   "hex": "#d23b3b"},
            {"name": "Xám",  "hex": "#6b7280"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Không", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "86kg",
            "power": "1100W", "dimensions": "1745 x 700 x 1050 mm",
        },
        "highlights": ["Không cần bằng lái", "KM 16%", "Kiểu dáng thời trang"],
        "description": "Xe máy điện dành cho học sinh, kiểu dáng thời trang.",
    },
    {
        "slug": "zgoo", "name": "Zgoo", "segment": "hoc_sinh",
        "segments": ["hoc_sinh"], "category_label": "Xe học sinh",
        "tagline": "Học sinh · cá tính", "needs_license": "Không cần",
        "speed": 49, "range_km": 70, "battery": "1.2 kWh", "charge": "6h30p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.5, "reviews": 110, "stock": 16,
        "price_buy": 15_900_000, "price_rent": None, "promo_pct": 16,
        "badge": "HỌC SINH", "status": "Đang bán",
        "inventory_names": ["ZGOO"],
        "colors": [
            {"name": "Đen",   "hex": "#1f2937"},
            {"name": "Xanh",  "hex": "#3b82f6"},
            {"name": "Trắng", "hex": "#e8eaed"},
        ],
        "specs": {
            "aux_battery": "Không", "esim": "Không", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "86kg",
            "power": "1100W", "dimensions": "1720 x 700 x 1050 mm",
        },
        "highlights": ["Không cần bằng lái", "KM 16%", "Thiết kế gọn nhẹ"],
        "description": "Xe máy điện dành cho học sinh, kiểu dáng thời trang.",
    },
    {
        "slug": "evo-grand-lite", "name": "Evo Grand Lite", "segment": "hoc_sinh",
        "segments": ["hoc_sinh"], "category_label": "Xe học sinh",
        "tagline": "Học sinh · đi học hằng ngày", "needs_license": "Không cần",
        "speed": 49, "range_km": 70, "battery": "1.2 kWh", "charge": "6h30p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 76, "stock": 18,
        "price_buy": 19_900_000, "price_rent": None, "promo_pct": 16,
        "badge": "HỌC SINH", "status": "Đang bán",
        "inventory_names": ["EVO GRAND LITE"],
        "colors": [
            {"name": "Xanh Oliu", "hex": "#6f7a52"},
            {"name": "Trắng",     "hex": "#e8eaed"},
            {"name": "Đỏ",        "hex": "#d23b3b"},
        ],
        "specs": {
            "aux_battery": "Có", "esim": "Không", "pedal": "Không",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "100kg",
            "power": "1900W", "dimensions": "1856 x 683 x 1133mm",
        },
        "highlights": ["Không cần bằng lái", "KM 16%", "Có pin phụ"],
        "description": "Xe máy điện dành cho học sinh, kiểu dáng thời trang.",
    },
    {
        "slug": "amio-s", "name": "Amio S", "segment": "hoc_sinh",
        "segments": ["hoc_sinh"], "category_label": "Xe học sinh",
        "tagline": "Học sinh · không bằng lái", "needs_license": "Không",
        "speed": 32, "range_km": 65, "battery": "1.024 kWh", "charge": "4h30p",
        "battery_warranty": "3 năm", "warranty": "3 năm",
        "rating": 4.7, "reviews": 188, "stock": 30,
        "price_buy": 13_900_000, "price_rent": None, "promo_pct": 16,
        "badge": "HỌC SINH", "status": "Đang bán", "featured": True,
        "inventory_names": ["AMIO S", "AMIO"],
        "colors": [
            {"name": "Đen Obsidian", "hex": "#1f2937"},
            {"name": "Trắng",        "hex": "#e8eaed"},
            {"name": "Xanh Rêu",     "hex": "#8fae9b"},
        ],
        "specs": {
            "aux_battery": "Không", "esim": "Không", "pedal": "Có",
            "motor_type": "Inhub", "lock_type": "Khoá cơ", "weight": "86kg",
            "power": "800W", "dimensions": "1715 x 690 x 1050 mm",
        },
        "highlights": ["Không cần bằng lái", "Có bàn đạp", "Tốc độ an toàn 32 km/h"],
        "description": "Xe máy điện dành cho học sinh, kiểu dáng thời trang.",
    },
]

_ROOT = Path(__file__).resolve().parent
_VEHICLE_IMAGE_MANIFEST = _ROOT / "web" / "assets" / "vehicles" / "manifest" / "product-images.json"

_COLOR_META = {
    "den": ("Đen", "#1f2937"),
    "do": ("Đỏ", "#d23b3b"),
    "trang": ("Trắng", "#e8eaed"),
    "xam": ("Xám", "#6b7280"),
    "vang": ("Vàng", "#f59e0b"),
    "vang-cat": ("Vàng cát", "#e7b75f"),
    "xanh": ("Xanh", "#2563eb"),
    "xanh-oliu": ("Xanh Oliu", "#6f7a52"),
    "xanh-reu": ("Xanh Rêu", "#8fae9b"),
    "tim-lavender": ("Tím Lavender", "#a78bfa"),
    "cam": ("Cam", "#f97316"),
}
_COLOR_ORDER = tuple(_COLOR_META.keys())


def _asset_path(kind, image_slug):
    return f"vehicles/{kind}/{image_slug}.webp"


def _vehicle_image_map():
    """Map Stock-xe image slugs to catalog product slugs based on file names."""
    if not _VEHICLE_IMAGE_MANIFEST.exists():
        return {}

    try:
        manifest = json.loads(_VEHICLE_IMAGE_MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    model_slugs = sorted((p["slug"] for p in PRODUCTS), key=len, reverse=True)
    by_model = {slug: [] for slug in model_slugs}
    for item in manifest.get("products", []):
        image_slug = item.get("slug", "")
        for model_slug in model_slugs:
            prefix = f"{model_slug}-"
            if not image_slug.startswith(prefix):
                continue
            color_slug = image_slug[len(prefix):]
            label, hex_code = _COLOR_META.get(
                color_slug,
                (color_slug.replace("-", " ").title(), "#6b7280"),
            )
            by_model[model_slug].append({
                "name": label,
                "hex": hex_code,
                "photo": _asset_path("webp", image_slug),
                "thumb": _asset_path("thumb", image_slug),
                "asset_slug": image_slug,
                "color_slug": color_slug,
            })
            break

    def sort_key(color):
        color_slug = color["color_slug"]
        if color_slug in _COLOR_ORDER:
            return (_COLOR_ORDER.index(color_slug), color["asset_slug"])
        return (len(_COLOR_ORDER), color["asset_slug"])

    return {
        model_slug: sorted(colors, key=sort_key)
        for model_slug, colors in by_model.items()
        if colors
    }


def _apply_vehicle_images():
    images = _vehicle_image_map()
    for product in PRODUCTS:
        colors = images.get(product["slug"])
        if not colors:
            continue
        product["colors"] = colors
        product["image_source"] = "Stock-xe"


_apply_vehicle_images()


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


def sellable(p):
    return p.get("status", "Đang bán") == "Đang bán"


def public_product(p):
    """Bản rút gọn cho danh sách + tính sẵn giá hiển thị."""
    base = price_for(p, "rent" if p.get("price_rent") else "buy")
    promo = p.get("promo_pct", 0)
    return {
        "slug": p["slug"], "name": p["name"], "segment": p["segment"],
        "segments": p.get("segments", [p["segment"]]),
        "category_label": p.get("category_label", ""),
        "tagline": p["tagline"], "needs_license": p["needs_license"],
        "speed": p["speed"], "range_km": p["range_km"], "battery": p["battery"],
        "rating": p["rating"], "reviews": p["reviews"], "stock": p["stock"],
        "badge": p["badge"], "status": p.get("status", "Đang bán"),
        "sellable": sellable(p), "promo_pct": promo, "featured": p.get("featured", False),
        "has_rent": bool(p.get("price_rent")),
        "price_base": base,
        "price_sale": sale_price(base, promo),
        "price_buy": p["price_buy"], "price_buy_sale": sale_price(p["price_buy"], promo),
        "price_rent": p.get("price_rent"),
        "price_rent_sale": sale_price(p["price_rent"], promo) if p.get("price_rent") else None,
        "colors": p["colors"],
        "specs": p.get("specs", {}),
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


# ── Đồng bộ tồn kho từ kho QLBH thật ────────────────────────────────────────
# Stock hiển thị trong app lấy theo số xe 'con' (in-stock) của model tương ứng
# trong QLBH-Website/data/inventory.json (map qua `inventory_names`).
# An toàn: chỉ ghi đè khi model có mặt trong kho; model không khớp giữ stock
# hardcode; xe ngừng kinh doanh (sellable=False) luôn = 0.
def _inventory_con_counts():
    path = Path(__file__).resolve().parent / "QLBH-Website" / "data" / "inventory.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    counts = {}
    for r in data:
        if isinstance(r, dict) and r.get("status") == "con":
            m = (r.get("model") or "").strip().upper()
            if m:
                counts[m] = counts.get(m, 0) + 1
    return counts


def apply_inventory_stock():
    """Cập nhật PRODUCTS[*]['stock'] theo kho thật. Gọi lúc import và có thể gọi
    lại sau khi kho thay đổi (vd sau import CSV / uat_stock)."""
    counts = _inventory_con_counts()
    for p in PRODUCTS:
        if not sellable(p):
            p["stock"] = 0
            continue
        if not counts:
            continue  # không đọc được kho → giữ stock hardcode
        names = p.get("inventory_names") or [p["name"]]
        present = [n for n in names if n.strip().upper() in counts]
        if present:
            p["stock"] = sum(counts[n.strip().upper()] for n in present)
    return counts


apply_inventory_stock()
