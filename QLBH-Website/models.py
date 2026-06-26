"""
Mô hình dữ liệu toàn diện cho hệ sinh thái bán hàng xe điện VinFast Thu Anh.

Triển khai trung thành theo thiết kế CSDL (qlbh-database.md): kết nối đa kênh
từ Ứng dụng (App khách hàng) → Hệ quản trị trung tâm (Website Admin).
Dùng SQLite cho môi trường phát triển; kiểu dữ liệu chuẩn (String/Integer)
để tương thích cả PostgreSQL khi triển khai thật.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


# 0. Cơ sở / Cửa hàng (TA1, TA2, TA3, KHO, KHAC)
class Store(Base):
    __tablename__ = "stores"
    store_id = Column(String(20), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(200))
    is_warehouse = Column(Integer, default=0)


# 1. Khách hàng
class Customer(Base):
    __tablename__ = "customers"
    customer_id = Column(String(40), primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    cccd_number = Column(String(12), unique=True)
    cccd_address = Column(Text)
    delivery_address = Column(Text)
    phone = Column(String(15), index=True)
    email = Column(String(100))
    customer_group = Column(String(30), default="Lẻ")  # Lẻ, Học sinh, Doanh nghiệp
    dob = Column(String(20))          # ngày sinh (YYYY-MM-DD)
    facebook = Column(String(120))
    zalo = Column(String(30))
    note = Column(Text)               # ghi chú
    created_at = Column(String(30))   # ISO datetime

    orders = relationship("Order", back_populates="customer")


# 2. Biến thể sản phẩm (model + màu)
class ProductVariant(Base):
    __tablename__ = "product_variants"
    sku_color = Column(String(60), primary_key=True)
    sku_type = Column(String(60), nullable=False, index=True)  # model
    color_name = Column(String(40))
    color_code = Column(String(10))
    segment = Column(String(20))  # doi_pin, kem_pin, hoc_sinh
    price_base = Column(Integer, nullable=False)


# 3. Kho hàng thực tế (gắn số khung IMEI1 + số máy IMEI2)
class InventoryItem(Base):
    __tablename__ = "inventory_items"
    vin_code = Column(String(50), primary_key=True, index=True)
    sku_color = Column(String(60), ForeignKey("product_variants.sku_color"))
    sku_type = Column(String(60), index=True)        # model (denormalized)
    color = Column(String(40))
    code = Column(String(40))                          # mã hãng (ESNE2LHHYES...)
    frame_number_imei1 = Column(String(50), unique=True)
    engine_number_imei2 = Column(String(50))
    import_unit_id = Column(String(20))                # cơ sở nhập
    current_unit_id = Column(String(20), index=True)   # cơ sở hiện tại
    import_time = Column(String(30))                   # date_in
    export_time = Column(String(30))                   # date_out
    status = Column(String(20), default="available", index=True)  # available, reserved, sold
    note = Column(String(200))
    goods_type = Column(String(20), default="vehicle")   # vehicle, vehicle_part, accessory
    battery_number = Column(String(60))                   # số pin
    charger_number = Column(String(60))                   # số sạc
    source_type = Column(String(20), default="factory")  # factory, dealer
    po_no = Column(String(40))                            # đơn đặt hàng nguồn


# 4. Nhật ký luân chuyển kho
class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    vin_code = Column(String(50), ForeignKey("inventory_items.vin_code"))
    from_unit = Column(String(20))
    to_unit = Column(String(20))
    action_type = Column(String(30))  # Nhập kho, Điều chuyển, Xuất bán
    created_at = Column(String(30))


# 5. Khuyến mại
class Promotion(Base):
    __tablename__ = "promotions"
    promo_code = Column(String(50), primary_key=True)
    name = Column(String(120))
    discount_value = Column(Integer, default=0)   # số tiền tuyệt đối
    discount_pct = Column(Integer, default=0)     # phần trăm
    sponsor = Column(String(50))                  # Hãng / Đại lý
    expired_at = Column(String(30))


# 6. Phụ kiện đi kèm
class Accessory(Base):
    __tablename__ = "accessories"
    part_sku = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)
    stock_quantity = Column(Integer, default=0)


# 7. Dịch vụ giá trị gia tăng (VAS)
class ValueAddedService(Base):
    __tablename__ = "value_added_services"
    service_code = Column(String(50), primary_key=True)
    service_name = Column(String(100), nullable=False)
    fee = Column(Integer, nullable=False)


# 8. Đơn hàng tổng hợp
class Order(Base):
    __tablename__ = "orders"
    order_id = Column(String(40), primary_key=True, index=True)
    order_no = Column(String(30), unique=True, index=True)  # DH00001
    customer_id = Column(String(40), ForeignKey("customers.customer_id"))
    store_id = Column(String(20), ForeignKey("stores.store_id"), index=True)
    vin_code = Column(String(50), ForeignKey("inventory_items.vin_code"))
    invoice_number = Column(String(50), unique=True)
    channel = Column(String(20), default="App")  # App, POS, Online
    delivery_address = Column(Text)
    subtotal = Column(Integer, default=0)
    discount = Column(Integer, default=0)
    vas_total = Column(Integer, default=0)
    total = Column(Integer, default=0)
    payment_status = Column(String(20), default="unpaid")  # unpaid, deposit, paid
    admin_status = Column(String(20), default="pending", index=True)
    # pending, vin_verified, completed, cancelled
    sales_id = Column(String(20), index=True)   # nhân viên sales lập đơn (SA1…)
    sales_name = Column(String(100))
    created_at = Column(String(30), index=True)
    export_time = Column(String(30))

    customer = relationship("Customer", back_populates="orders")
    details = relationship("OrderDetail", back_populates="order")
    payments = relationship("Payment", back_populates="order")


# 9. Chi tiết đơn hàng
class OrderDetail(Base):
    __tablename__ = "order_details"
    detail_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(40), ForeignKey("orders.order_id"))
    vin_code = Column(String(50), ForeignKey("inventory_items.vin_code"))
    sku_type = Column(String(60))
    part_sku = Column(String(50))
    service_code = Column(String(50))
    promo_code = Column(String(50))
    quantity = Column(Integer, default=1)
    unit_price = Column(Integer, default=0)
    final_price = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="details")


# 10. Thanh toán đa kênh
class Payment(Base):
    __tablename__ = "payments"
    payment_id = Column(String(40), primary_key=True, index=True)
    order_id = Column(String(40), ForeignKey("orders.order_id"))
    payment_method = Column(String(30))  # Tiền mặt, Chuyển khoản, POS, BNPL
    amount_paid = Column(Integer, default=0)
    reference_code = Column(String(100))
    created_at = Column(String(30), index=True)

    order = relationship("Order", back_populates="payments")
    reconciliation = relationship("ReconciliationLog", back_populates="payment", uselist=False)


# 11. Công nợ đối tác tài chính (BNPL / trả góp)
class Debt(Base):
    __tablename__ = "debts"
    debt_id = Column(String(40), primary_key=True)
    customer_id = Column(String(40), ForeignKey("customers.customer_id"))
    order_id = Column(String(40), ForeignKey("orders.order_id"))
    principal_amount = Column(Integer, nullable=False)
    due_date = Column(String(30))
    fin_partner_id = Column(String(50))  # TPBank, HomeCredit...


# 12. Nhật ký đối soát kế toán
class ReconciliationLog(Base):
    __tablename__ = "reconciliation_logs"
    recon_id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(String(40), ForeignKey("payments.payment_id"))
    status = Column(String(20), default="unreconciled")  # unreconciled, matched, discrepancy
    verified_at = Column(String(30))

    payment = relationship("Payment", back_populates="reconciliation")


# =====================================================================
#  MUA HÀNG / NHẬP HÀNG (Procurement) — đặt hàng nhà máy / đại lý ngoài
# =====================================================================

# 14. Nhà cung cấp (nhà máy hoặc đại lý khác)
class Supplier(Base):
    __tablename__ = "suppliers"
    supplier_code = Column(String(30), primary_key=True)  # R006, DL-HN02…
    name = Column(String(160), nullable=False)
    source_type = Column(String(20), index=True)          # factory, dealer
    address = Column(String(220))
    phone = Column(String(30))


# 15. Đơn đặt hàng (Purchase Order) — lệnh đặt từ nhà máy/đại lý
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    po_no = Column(String(40), primary_key=True, index=True)   # 5011372342
    source_type = Column(String(20), index=True)               # factory, dealer
    supplier_code = Column(String(30), ForeignKey("suppliers.supplier_code"))
    supplier_name = Column(String(160))
    goods_type = Column(String(20), index=True)                # vehicle, vehicle_part, accessory
    approved_date = Column(String(30), index=True)             # ngày duyệt lệnh đặt
    expected_date = Column(String(30))                         # ngày dự kiến trả
    status = Column(String(20), default="open", index=True)    # open, partial, completed, cancelled
    deliver_to_unit = Column(String(20))                       # cơ sở nhận (TA1/TA2/TA3)
    note = Column(String(300))
    created_at = Column(String(30))

    lines = relationship("PurchaseOrderLine", back_populates="po")
    receipts = relationship("GoodsReceipt", back_populates="po")


# 16. Chi tiết dòng đặt hàng (mã hàng + số lượng đặt + đơn giá)
class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"
    line_id = Column(Integer, primary_key=True, autoincrement=True)
    po_no = Column(String(40), ForeignKey("purchase_orders.po_no"), index=True)
    part_no = Column(String(60))            # mã phụ tùng / mã hàng hóa
    description = Column(String(160))       # VINFAST FLAZZ XANH
    goods_type = Column(String(20))
    sku_type = Column(String(60))           # model (với xe)
    color = Column(String(40))
    unit = Column(String(20), default="Bộ")
    ordered_qty = Column(Integer, default=0)
    unit_price = Column(Integer, default=0)

    po = relationship("PurchaseOrder", back_populates="lines")


# 17. Phiếu giao hàng (Goods Receipt) — một lô nhà máy trả về theo PO
class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    delivery_no = Column(String(40), primary_key=True, index=True)  # 6012136459
    po_no = Column(String(40), ForeignKey("purchase_orders.po_no"), index=True)
    received_date = Column(String(30), index=True)
    delivery_from = Column(String(220))
    delivery_to = Column(String(260))
    transporter = Column(String(120))
    vehicle_plate = Column(String(30))
    driver_name = Column(String(90))
    deliver_to_unit = Column(String(20))   # cơ sở nhận
    total_qty = Column(Integer, default=0)
    note = Column(String(200))

    po = relationship("PurchaseOrder", back_populates="receipts")
    items = relationship("GoodsReceiptItem", back_populates="receipt")


# 18. Chi tiết phiếu giao (từng VIN/đơn vị nhận trong lô)
class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"
    item_id = Column(Integer, primary_key=True, autoincrement=True)
    delivery_no = Column(String(40), ForeignKey("goods_receipts.delivery_no"), index=True)
    po_no = Column(String(40), index=True)
    part_no = Column(String(60))
    description = Column(String(160))
    goods_type = Column(String(20))
    vin = Column(String(50))               # số VIN (Serial/Batch no)
    frame_number = Column(String(50))      # số khung (imei1)
    engine_number = Column(String(50))     # số máy (imei2)
    battery_number = Column(String(60))    # số pin
    charger_number = Column(String(60))    # số sạc
    unit = Column(String(20), default="Bộ")
    qty = Column(Integer, default=1)

    receipt = relationship("GoodsReceipt", back_populates="items")


# =====================================================================
#  HỒ SƠ KHÁCH HÀNG — lịch sử bảo dưỡng & linh phụ kiện
# =====================================================================

# 19. Lịch sử bảo dưỡng / dịch vụ sau bán
class ServiceRecord(Base):
    __tablename__ = "service_records"
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(40), ForeignKey("customers.customer_id"), index=True)
    vin = Column(String(50), index=True)
    service_no = Column(String(30))
    service_date = Column(String(30), index=True)
    service_type = Column(String(60))   # Bảo dưỡng định kỳ, Sửa chữa, Thay pin…
    description = Column(String(300))
    odometer = Column(Integer)          # số km
    cost = Column(Integer, default=0)
    technician = Column(String(80))
    store_id = Column(String(20))
    status = Column(String(20), default="completed")  # completed, in_progress, scheduled


# 20. Lịch sử mua linh kiện / phụ kiện
class PartSale(Base):
    __tablename__ = "part_sales"
    sale_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String(40), ForeignKey("customers.customer_id"), index=True)
    order_no = Column(String(30))
    vin = Column(String(50))
    part_sku = Column(String(50))
    part_name = Column(String(120))
    category = Column(String(30))       # Phụ kiện đại lý, Linh kiện xe
    qty = Column(Integer, default=1)
    unit_price = Column(Integer, default=0)
    total = Column(Integer, default=0)
    sale_date = Column(String(30), index=True)
