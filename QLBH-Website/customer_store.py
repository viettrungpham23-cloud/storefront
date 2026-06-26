"""
Kho dữ liệu khách hàng dạng THƯ MỤC RIÊNG (file-based), tách khỏi SQLite.

Cấu trúc:
  customer_db/
    profiles/<customer_id>.json          ← hồ sơ KH, TỰ ĐỘNG ghi khi khách được lưu
    media/<customer_id>/<group>/<name>.svg ← ảnh đính kèm, lưu định dạng SVG, chia nhóm

- save_customer(data): tự động ghi hồ sơ ra file khi khách hàng được tạo/cập nhật.
- get_customer(id) / list_customers(): truy xuất dữ liệu.
- save_image_svg(...): nhận ảnh (data URL) → bọc vào SVG → lưu theo nhóm (ID/Xe/…).
- list_images(id): liệt kê ảnh theo nhóm để hiển thị gallery.
Thư mục media được FastAPI mount tĩnh tại /customer-files (xem main.py).
"""
import os
import re
import json

BASE = os.path.join(os.path.dirname(__file__), "customer_db")
PROFILES = os.path.join(BASE, "profiles")
MEDIA = os.path.join(BASE, "media")

os.makedirs(PROFILES, exist_ok=True)
os.makedirs(MEDIA, exist_ok=True)


def _safe(s):
    return re.sub(r"[^A-Za-z0-9_.-]", "_", str(s or "")) or "x"


# ---------- Hồ sơ ----------
def _profile_path(cid):
    return os.path.join(PROFILES, _safe(cid) + ".json")


def save_customer(data: dict):
    """Tự động ghi hồ sơ KH ra thư mục riêng (mirror của SQLite)."""
    with open(_profile_path(data["customer_id"]), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_customer(cid):
    p = _profile_path(cid)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return None


def list_customers():
    if not os.path.isdir(PROFILES):
        return []
    return [f[:-5] for f in os.listdir(PROFILES) if f.endswith(".json")]


def store_stats():
    profiles = len([f for f in os.listdir(PROFILES) if f.endswith(".json")]) if os.path.isdir(PROFILES) else 0
    imgs = 0
    if os.path.isdir(MEDIA):
        for root, _dirs, files in os.walk(MEDIA):
            imgs += sum(1 for f in files if f.lower().endswith(".svg"))
    return {"profiles": profiles, "images": imgs, "folder": "customer_db/"}


# ---------- Ảnh (lưu dạng SVG, chia nhóm) ----------
def _media_dir(cid, group):
    return os.path.join(MEDIA, _safe(cid), _safe(group))


def _wrap_svg(data_url: str) -> str:
    """Bọc ảnh raster (data URL) vào một file SVG hợp lệ."""
    m = re.match(r"data:(image/[^;]+);base64,(.*)", (data_url or "").strip(), re.S)
    if not m:
        # đã là nội dung SVG thì giữ nguyên
        return data_url if "<svg" in (data_url or "") else "<svg xmlns='http://www.w3.org/2000/svg'/>"
    mime, b64 = m.group(1), m.group(2)
    return ("<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' "
            "viewBox='0 0 1000 1000' preserveAspectRatio='xMidYMid meet'>"
            f"<image width='1000' height='1000' preserveAspectRatio='xMidYMid meet' "
            f"xlink:href='data:{mime};base64,{b64}'/></svg>")


def save_image_svg(cid, group, filename, data_url) -> dict:
    d = _media_dir(cid, group)
    os.makedirs(d, exist_ok=True)
    name = _safe(filename)
    name = (os.path.splitext(name)[0] or "img") + ".svg"
    # tránh ghi đè
    full = os.path.join(d, name)
    i = 1
    while os.path.exists(full):
        name = f"{os.path.splitext(name)[0]}_{i}.svg"
        full = os.path.join(d, name)
        i += 1
    with open(full, "w", encoding="utf-8") as f:
        f.write(_wrap_svg(data_url))
    return {"group": _safe(group), "name": name,
            "url": f"/customer-files/media/{_safe(cid)}/{_safe(group)}/{name}"}


def write_raw_svg(cid, group, name, svg_content):
    """Ghi trực tiếp một SVG (dùng cho seed ảnh mẫu)."""
    d = _media_dir(cid, group)
    os.makedirs(d, exist_ok=True)
    if not name.endswith(".svg"):
        name += ".svg"
    with open(os.path.join(d, name), "w", encoding="utf-8") as f:
        f.write(svg_content)


def list_images(cid) -> list:
    base = os.path.join(MEDIA, _safe(cid))
    out = []
    if not os.path.isdir(base):
        return out
    for group in sorted(os.listdir(base)):
        gdir = os.path.join(base, group)
        if not os.path.isdir(gdir):
            continue
        files = [f for f in sorted(os.listdir(gdir)) if f.lower().endswith(".svg")]
        if files:
            out.append({
                "group": group,
                "images": [{"name": f, "url": f"/customer-files/media/{_safe(cid)}/{group}/{f}"}
                           for f in files],
            })
    return out
