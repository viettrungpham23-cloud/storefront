import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_inventory_for_uat(db: Session, max_items_per_model: int = 20):
    """
    Giữ lại tối đa `max_items_per_model` xe có trạng thái `available` cho mỗi mẫu xe (sku_type).
    Các xe `available` dôi dư sẽ bị xóa khỏi bảng inventory_items và inventory_logs.
    Không chạm vào xe trạng thái `sold`, `reserved` hay các dữ liệu khác.
    """
    logger.info("Starting UAT inventory cleanup...")
    
    # Lấy danh sách các dòng xe (sku_type) có trong kho
    sku_types = db.query(models.ProductVariant.sku_type).distinct().all()
    sku_types = [s[0] for s in sku_types if s[0]]
    
    total_deleted = 0
    for sku in sku_types:
        # Lấy danh sách VIN của xe available theo dòng xe
        available_vins_query = db.query(models.InventoryItem.vin_code).filter(
            models.InventoryItem.sku_type == sku,
            models.InventoryItem.status == 'available'
        ).all()
        vins = [v[0] for v in available_vins_query]
        
        if len(vins) > max_items_per_model:
            vins_to_delete = vins[max_items_per_model:]
            logger.info(f"Model {sku}: keeping 20, deleting {len(vins_to_delete)} surplus available items.")
            
            # Xóa các xe này khỏi nhật ký kho
            # Sqlite có thể gặp vấn đề limit parameter trong IN query nếu danh sách quá lớn (> 999).
            # Tuy nhiên với batch nhỏ (vài nghìn) chia theo chunk nếu cần, nhưng 3000 xe thì an toàn
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
        else:
            logger.info(f"Model {sku}: has {len(vins)} items, no cleanup needed.")
            
    db.commit()
    logger.info(f"UAT inventory cleanup finished. Total items deleted: {total_deleted}")
    return total_deleted

if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    try:
        deleted = clean_inventory_for_uat(db)
        print(f"Xong! Đã xoá {deleted} xe available thừa, chỉ giữ lại tối đa {20} chiếc mỗi mẫu.")
    finally:
        db.close()
