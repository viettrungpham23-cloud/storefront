#!/usr/bin/env python3
"""Chuẩn hoá seed inventory.json cho UAT: mỗi `model` có ĐÚNG 20 xe `con` (in-stock).

- Mẫu thừa con  → cắt bớt phần dôi dư.
- Mẫu thiếu con → sinh thêm bản ghi `con` (clone từ record mẫu của model, dùng dữ
  liệu thô có sẵn; VIN/engine/code sinh mới, không trùng).
- Giữ nguyên toàn bộ record `da_xuat` (lịch sử bán).
- Sao lưu bản gốc sang inventory.json.bak trước khi ghi đè.

Chạy: python3 QLBH-Website/scripts/uat_seed_inventory.py [TARGET_PER_MODEL]
"""
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]            # QLBH-Website/
INV = ROOT / "data" / "inventory.json"
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 20


def gen_code(prefix: str, seq: int, used: set, width: int = 10) -> str:
    while True:
        c = f"{prefix}{seq:0{width}d}"
        if c not in used:
            used.add(c)
            return c
        seq += 1


def main():
    data = json.loads(INV.read_text(encoding="utf-8"))
    used_vins = {r.get("vin") for r in data if r.get("vin")}
    used_eng = {r.get("engine") for r in data if r.get("engine")}

    by_model = defaultdict(list)
    for r in data:
        by_model[(r.get("model") or "").strip()].append(r)

    kept, created, trimmed = [], 0, 0
    for model, recs in by_model.items():
        if not model:
            kept.extend(recs)
            continue
        sold = [r for r in recs if r.get("status") != "con"]
        con = [r for r in recs if r.get("status") == "con"]
        kept.extend(sold)
        if len(con) >= TARGET:
            kept.extend(con[:TARGET])
            trimmed += len(con) - TARGET
        else:
            kept.extend(con)
            template = (con or sold or [{}])[0]
            for _ in range(TARGET - len(con)):
                vin = gen_code("UATVIN", len(used_vins) + 1, used_vins)
                eng = gen_code("UATENG", len(used_eng) + 1, used_eng)
                kept.append({
                    "date_in": template.get("date_in", "2025-01-01"),
                    "store": template.get("store", "TA1"),
                    "code": template.get("code", ""),
                    "model": model,
                    "color": template.get("color", ""),
                    "vin": vin,
                    "engine": eng,
                    "date_out": "",
                    "status": "con",
                    "note": "UAT seed (auto-generated)",
                })
                created += 1

    shutil.copy2(INV, INV.with_suffix(".json.bak"))
    INV.write_text(json.dumps(kept, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Models: {len([m for m in by_model if m])} | records: {len(kept)} "
          f"(was {len(data)}) | created: {created} | trimmed surplus con: {trimmed}")


if __name__ == "__main__":
    main()
