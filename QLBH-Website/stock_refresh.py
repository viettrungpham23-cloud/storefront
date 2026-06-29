import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _gen_unique(prefix: str, seq: int, used: set, width: int = 10) -> str:
    """Sinh một mã (VIN/engine) duy nhất dạng UAT… không trùng tập `used`."""
    while True:
        candidate = f"{prefix}{seq:0{width}d}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        seq += 1


def _topup_model(db: Session, sku: str, need: int, used_vins: set, used_engines: set) -> int:
    """Sinh thêm `need` xe `available` cho mẫu `sku`, clone từ một item mẫu sẵn có."""
    template = db.query(models.InventoryItem).filter(
        models.InventoryItem.sku_type == sku
    ).first()
    variant = db.query(models.ProductVariant).filter(
        models.ProductVariant.sku_type == sku
    ).first()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today = datetime.now().strftime("%Y-%m-%d")
    sku_color = (template.sku_color if template else None) or (variant.sku_color if variant else None)
    color = (template.color if template else None) or (variant.color_name if variant else "")
    code = template.code if template else ""
    unit = (template.current_unit_id if template else None) or "TA1"
    created = 0
    for _ in range(need):
        vin = _gen_unique("UATVIN", len(used_vins) + 1, used_vins)
        eng = _gen_unique("UATENG", len(used_engines) + 1, used_engines)
        db.add(models.InventoryItem(
            vin_code=vin,
            sku_color=sku_color,
            sku_type=sku,
            color=color,
            code=code,
            frame_number_imei1=vin,
            engine_number_imei2=eng,
            import_unit_id=unit,
            current_unit_id=unit,
            import_time=today,
            export_time=None,
            status="available",
            note="UAT seed (auto-generated)",
            goods_type="vehicle",
            source_type="factory",
        ))
        db.add(models.InventoryLog(
            vin_code=vin, from_unit=None, to_unit=unit,
            action_type="Nhập kho", created_at=now,
        ))
        created += 1
    return created


def clean_inventory_for_uat(db: Session, max_items_per_model: int = 20):
    """
    Chuẩn hoá kho cho UAT: mỗi mẫu xe (sku_type) có ĐÚNG `max_items_per_model` xe
    trạng thái `available`.
      - Mẫu thừa available  → xoá bớt phần dôi dư (kèm inventory_logs).
      - Mẫu thiếu available → SINH thêm bản ghi available (clone từ item mẫu).
    Không chạm tới xe `sold`, `reserved`.
    Trả về dict {deleted, created} (giữ tương thích ngược: ép sang int ở caller nếu cần).
    """
    logger.info("Starting UAT inventory normalization (target=%d/model)...", max_items_per_model)

    sku_types = db.query(models.ProductVariant.sku_type).distinct().all()
    sku_types = [s[0] for s in sku_types if s[0]]

    # Tập mã đã dùng để tránh trùng khi sinh mới
    used_vins = {v[0] for v in db.query(models.InventoryItem.vin_code).all() if v[0]}
    used_engines = {e[0] for e in db.query(models.InventoryItem.engine_number_imei2).all() if e[0]}

    total_deleted = 0
    total_created = 0
    for sku in sku_types:
        vins = [v[0] for v in db.query(models.InventoryItem.vin_code).filter(
            models.InventoryItem.sku_type == sku,
            models.InventoryItem.status == 'available'
        ).all()]

        if len(vins) > max_items_per_model:
            vins_to_delete = vins[max_items_per_model:]
            logger.info("Model %s: keeping %d, deleting %d surplus.", sku, max_items_per_model, len(vins_to_delete))
            chunk_size = 500
            for i in range(0, len(vins_to_delete), chunk_size):
                chunk = vins_to_delete[i:i+chunk_size]
                db.query(models.InventoryLog).filter(
                    models.InventoryLog.vin_code.in_(chunk)
                ).delete(synchronize_session=False)
                db.query(models.InventoryItem).filter(
                    models.InventoryItem.vin_code.in_(chunk)
                ).delete(synchronize_session=False)
            total_deleted += len(vins_to_delete)
        elif len(vins) < max_items_per_model:
            need = max_items_per_model - len(vins)
            logger.info("Model %s: has %d, generating %d to reach %d.", sku, len(vins), need, max_items_per_model)
            total_created += _topup_model(db, sku, need, used_vins, used_engines)
        else:
            logger.info("Model %s: already at %d, no change.", sku, len(vins))

    db.commit()
    logger.info("UAT normalization done. Deleted=%d, Created=%d.", total_deleted, total_created)
    return {"deleted": total_deleted, "created": total_created}


if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    try:
        res = clean_inventory_for_uat(db)
        print(f"Xong! Đã xoá {res['deleted']} xe available thừa, sinh thêm {res['created']} xe, "
              f"giữ đúng 20 chiếc available mỗi mẫu.")
    finally:
        db.close()
