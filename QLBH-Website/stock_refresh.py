"""Targeted inventory refresh for the storefront launch set.

This keeps the four requested models at 20 available units each without
rebuilding the whole business database. It is intended for a one-time admin
maintenance run after deploying the updated `data/inventory.json`.
"""
from __future__ import annotations

import json
import os
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import reference as ref


DATA = os.path.join(os.path.dirname(__file__), "data", "inventory.json")
TARGET_MODELS = ("AMIO S", "EVO GRAND LITE", "EVO GRAND", "VERO X")
TARGET_NOTE = "cập nhật tồn kho 20 xe/mẫu"


def _target_rows() -> dict[str, list[dict]]:
    raw = json.load(open(DATA, encoding="utf-8"))
    rows = {model: [] for model in TARGET_MODELS}
    for row in raw:
        model = (row.get("model") or "").strip().upper()
        if model in rows and row.get("status") == "con":
            rows[model].append(row)

    bad = {model: len(items) for model, items in rows.items() if len(items) != 20}
    if bad:
        raise RuntimeError(f"Tồn kho target không đúng 20 xe/mẫu: {bad}")
    return rows


def _ensure_variant(db: Session, model: str, color: str) -> str:
    sku_color = f"{model} | {color}"
    variant = db.get(models.ProductVariant, sku_color)
    payload = {
        "sku_type": model,
        "color_name": color,
        "color_code": ref.color_hex(color),
        "segment": ref.segment_of(model),
        "price_base": ref.price_of(model),
    }
    if variant:
        for key, value in payload.items():
            setattr(variant, key, value)
    else:
        db.add(models.ProductVariant(sku_color=sku_color, **payload))
    return sku_color


def refresh_target_stock(db: Session) -> dict:
    rows_by_model = _target_rows()
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    inserted = updated = archived = skipped_linked = 0

    target_vins_by_model = {
        model: {row["vin"] for row in rows}
        for model, rows in rows_by_model.items()
    }

    for model, rows in rows_by_model.items():
        for row in rows:
            vin = row["vin"]
            linked_order = db.query(models.Order.order_id).filter(models.Order.vin_code == vin).first()
            if linked_order:
                skipped_linked += 1
                continue

            sku_color = _ensure_variant(db, model, row.get("color") or "Không rõ")
            item = db.get(models.InventoryItem, vin)
            payload = {
                "sku_color": sku_color,
                "sku_type": model,
                "color": row.get("color") or "Không rõ",
                "code": row.get("code") or "",
                "frame_number_imei1": vin,
                "engine_number_imei2": row.get("engine") or "",
                "import_unit_id": row.get("store") or "TA1",
                "current_unit_id": row.get("store") or "TA1",
                "import_time": row.get("date_in") or now[:10],
                "export_time": "",
                "status": "available",
                "note": (row.get("note") or TARGET_NOTE)[:200],
                "goods_type": "vehicle",
                "source_type": "factory",
            }
            if item:
                for key, value in payload.items():
                    setattr(item, key, value)
                updated += 1
            else:
                db.add(models.InventoryItem(vin_code=vin, **payload))
                db.add(models.InventoryLog(
                    vin_code=vin,
                    from_unit=None,
                    to_unit=payload["current_unit_id"],
                    action_type="Chuẩn hóa tồn kho",
                    created_at=now,
                ))
                inserted += 1

    for model, target_vins in target_vins_by_model.items():
        extras = (
            db.query(models.InventoryItem)
            .filter(func.upper(models.InventoryItem.sku_type) == model)
            .filter(models.InventoryItem.status == "available")
            .filter(~models.InventoryItem.vin_code.in_(target_vins))
            .all()
        )
        for item in extras:
            item.status = "sold"
            item.export_time = item.export_time or now
            item.note = "Ẩn khỏi tồn bán: chuẩn hóa 20 xe/mẫu"
            db.add(models.InventoryLog(
                vin_code=item.vin_code,
                from_unit=item.current_unit_id,
                to_unit="Chuẩn hóa dữ liệu",
                action_type="Ẩn khỏi tồn bán",
                created_at=now,
            ))
            archived += 1

    db.commit()
    return {
        "inserted": inserted,
        "updated": updated,
        "archived": archived,
        "skipped_linked": skipped_linked,
        "target_models": list(TARGET_MODELS),
    }
