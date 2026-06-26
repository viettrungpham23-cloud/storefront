"""
API phân tích phục vụ Dashboard bán hàng chuẩn mực.
Tổng hợp toàn bộ dữ liệu đã xây dựng: doanh thu, đơn, kho, khách, đối soát.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard Phân tích"])

# Đơn được tính doanh thu (đã chốt)
DONE = "admin_status = 'completed'"


def get_period_bounds(period: str):
    """Tính start_date và prev_start_date cho các mốc thời gian."""
    now = datetime.now()
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start - timedelta(days=1)
        return start.strftime("%Y-%m-%d %H:%M:%S"), prev_start.strftime("%Y-%m-%d %H:%M:%S"), start.strftime("%Y-%m-%d %H:%M:%S")
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start - timedelta(days=7)
        return start.strftime("%Y-%m-%d %H:%M:%S"), prev_start.strftime("%Y-%m-%d %H:%M:%S"), start.strftime("%Y-%m-%d %H:%M:%S")
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m = start.month - 1
        y = start.year
        if m == 0:
            m = 12
            y -= 1
        prev_start = start.replace(year=y, month=m, day=1)
        return start.strftime("%Y-%m-%d %H:%M:%S"), prev_start.strftime("%Y-%m-%d %H:%M:%S"), start.strftime("%Y-%m-%d %H:%M:%S")
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = start.replace(year=start.year - 1)
        return start.strftime("%Y-%m-%d %H:%M:%S"), prev_start.strftime("%Y-%m-%d %H:%M:%S"), start.strftime("%Y-%m-%d %H:%M:%S")
    return None, None, None


@router.get("/summary")
def summary(period: str = Query("all"), db: Session = Depends(get_db)):
    start_date, prev_start, prev_end = get_period_bounds(period)
    
    total = db.execute(text(f"SELECT COUNT(*) c, COALESCE(SUM(total),0) rev FROM orders WHERE {DONE}")).first()
    
    w_cur = DONE
    w_prev = DONE
    params = {}
    if start_date:
        w_cur += " AND created_at >= :start"
        w_prev += " AND created_at >= :pstart AND created_at < :pend"
        params = {"start": start_date, "pstart": prev_start, "pend": prev_end}
        
    cm = db.execute(text(f"SELECT COUNT(*) c, COALESCE(SUM(total),0) rev FROM orders WHERE {w_cur}"), params).first()
    if start_date:
        pm = db.execute(text(f"SELECT COUNT(*) c, COALESCE(SUM(total),0) rev FROM orders WHERE {w_prev}"), params).first()
        pm_rev = pm.rev
    else:
        pm = {"c": 0, "rev": 0}
        pm_rev = 0
        
    growth = round((cm.rev - pm_rev) / pm_rev * 100, 1) if pm_rev else 0.0

    units = db.execute(text("SELECT COUNT(*) FROM order_details")).scalar()
    customers = db.execute(text("SELECT COUNT(*) FROM customers")).scalar()
    collected = db.execute(text("SELECT COALESCE(SUM(amount_paid),0) FROM payments")).scalar()

    inv = {r.status: r.c for r in db.execute(text(
        "SELECT status, COUNT(*) c FROM inventory_items GROUP BY status"))}
    pending = db.execute(text("SELECT COUNT(*) FROM orders WHERE admin_status IN ('pending','vin_verified')")).scalar()
    debt = db.execute(text("SELECT COALESCE(SUM(principal_amount),0) FROM debts")).scalar()
    aov = round(total.rev / total.c) if total.c else 0

    return {
        "ref_month": period,
        "revenue_total": total.rev,
        "revenue_month": cm.rev,
        "revenue_prev_month": pm_rev,
        "growth_pct": growth,
        "orders_total": total.c,
        "orders_month": cm.c,
        "units_sold": units,
        "customers": customers,
        "avg_order_value": aov,
        "collected": collected,
        "outstanding_debt": debt,
        "inventory_available": inv.get("available", 0),
        "inventory_reserved": inv.get("reserved", 0),
        "inventory_sold": inv.get("sold", 0),
        "orders_pending": pending,
    }


@router.get("/revenue")
def revenue_timeseries(months: int = Query(12, ge=1, le=36), period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = DONE
    params = {}
    if start:
        w += " AND created_at >= :s"
        params["s"] = start

    if period == "day":
        grp = "TO_CHAR(created_at, 'YYYY-MM-DD HH24:00')"
    elif period in ["week", "month"]:
        grp = "TO_CHAR(created_at, 'YYYY-MM-DD')"
    else:
        grp = "TO_CHAR(created_at, 'YYYY-MM')"

    rows = db.execute(text(
        f"SELECT {grp} period, COUNT(*) orders, COALESCE(SUM(total),0) revenue "
        f"FROM orders WHERE {w} GROUP BY period ORDER BY period"), params).all()
    
    data = [{"period": r.period, "orders": r.orders, "revenue": r.revenue} for r in rows]
    return data[-months:] if period == "all" else data


@router.get("/sales-by-model")
def sales_by_model(limit: int = 10, period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = DONE
    params = {"l": limit}
    if start:
        w += " AND o.created_at >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT od.sku_type model, COUNT(*) units, COALESCE(SUM(od.final_price),0) revenue "
        f"FROM order_details od JOIN orders o ON o.order_id=od.order_id "
        f"WHERE {w} GROUP BY od.sku_type ORDER BY units DESC LIMIT :l"), params).all()
    return [{"model": r.model, "units": r.units, "revenue": r.revenue} for r in rows]


@router.get("/sales-by-store")
def sales_by_store(period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = DONE
    params = {}
    if start:
        w += " AND o.created_at >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT o.store_id store, COUNT(*) units, COALESCE(SUM(o.total),0) revenue "
        f"FROM orders o WHERE {w} GROUP BY o.store_id ORDER BY revenue DESC"), params).all()
    return [{"store": r.store, "units": r.units, "revenue": r.revenue} for r in rows]


@router.get("/sales-by-segment")
def sales_by_segment(period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = DONE
    params = {}
    if start:
        w += " AND o.created_at >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT pv.segment segment, COUNT(*) units, COALESCE(SUM(od.final_price),0) revenue "
        f"FROM order_details od JOIN product_variants pv ON pv.sku_type = od.sku_type "
        f"JOIN orders o ON o.order_id=od.order_id "
        f"WHERE {w} GROUP BY pv.segment ORDER BY revenue DESC"), params).all()
    label = {"doi_pin": "Đổi pin", "kem_pin": "Kèm pin", "hoc_sinh": "Học sinh"}
    return [{"segment": label.get(r.segment, r.segment or "Khác"),
             "key": r.segment, "units": r.units, "revenue": r.revenue} for r in rows]


@router.get("/sales-by-channel")
def sales_by_channel(period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = DONE
    params = {}
    if start:
        w += " AND created_at >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT channel, COUNT(*) units, COALESCE(SUM(total),0) revenue "
        f"FROM orders WHERE {w} GROUP BY channel ORDER BY revenue DESC"), params).all()
    return [{"channel": r.channel, "units": r.units, "revenue": r.revenue} for r in rows]


@router.get("/payment-methods")
def payment_methods(period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = "1=1"
    params = {}
    if start:
        w = "payment_date >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT payment_method method, COUNT(*) count, COALESCE(SUM(amount_paid),0) amount "
        f"FROM payments WHERE {w} GROUP BY payment_method ORDER BY amount DESC"), params).all()
    return [{"method": r.method, "count": r.count, "amount": r.amount} for r in rows]


@router.get("/inventory-summary")
def inventory_summary(db: Session = Depends(get_db)):
    by_store = db.execute(text(
        "SELECT current_unit_id store, status, COUNT(*) c FROM inventory_items "
        "GROUP BY current_unit_id, status")).all()
    stores = {}
    for r in by_store:
        s = stores.setdefault(r.store, {"store": r.store, "available": 0, "reserved": 0, "sold": 0})
        s[r.status] = r.c
    low = db.execute(text(
        "SELECT sku_type model, COUNT(*) available FROM inventory_items "
        "WHERE status='available' GROUP BY sku_type HAVING COUNT(*) <= 5 ORDER BY COUNT(*) ASC LIMIT 10")).all()
    top_avail = db.execute(text(
        "SELECT sku_type model, COUNT(*) available FROM inventory_items "
        "WHERE status='available' GROUP BY sku_type ORDER BY COUNT(*) DESC LIMIT 8")).all()
    return {
        "by_store": list(stores.values()),
        "low_stock": [{"model": r.model, "available": r.available} for r in low],
        "top_available": [{"model": r.model, "available": r.available} for r in top_avail],
    }


@router.get("/reconciliation")
def reconciliation(db: Session = Depends(get_db)):
    rows = db.execute(text(
        "SELECT rl.status, COUNT(*) c, COALESCE(SUM(p.amount_paid),0) amount "
        "FROM reconciliation_logs rl JOIN payments p ON p.payment_id = rl.payment_id "
        "GROUP BY rl.status")).all()
    label = {"matched": "Đã khớp", "unreconciled": "Chưa đối soát", "discrepancy": "Lệch/Cảnh báo"}
    return [{"status": r.status, "label": label.get(r.status, r.status),
             "count": r.c, "amount": r.amount} for r in rows]


@router.get("/top-customers")
def top_customers(limit: int = 8, period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = "1=1"
    params = {"l": limit}
    if start:
        w = "o.created_at >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT c.customer_id, c.full_name, c.phone, c.customer_group, "
        f"COUNT(o.order_id) orders, COALESCE(SUM(o.total),0) spend "
        f"FROM customers c JOIN orders o ON o.customer_id = c.customer_id "
        f"WHERE {w} GROUP BY c.customer_id ORDER BY spend DESC LIMIT :l"), params).all()
    return [{"customer_id": r.customer_id, "name": r.full_name, "phone": r.phone,
             "group": r.customer_group, "orders": r.orders, "spend": r.spend} for r in rows]


@router.get("/recent-activity")
def recent_activity(limit: int = 12, period: str = "all", db: Session = Depends(get_db)):
    start, _, _ = get_period_bounds(period)
    w = "1=1"
    params = {"l": limit}
    if start:
        w = "o.created_at >= :s"
        params["s"] = start
        
    rows = db.execute(text(
        f"SELECT o.order_no, o.total, o.channel, o.store_id, o.admin_status, o.created_at, "
        f"c.full_name, od.sku_type "
        f"FROM orders o JOIN customers c ON c.customer_id=o.customer_id "
        f"LEFT JOIN order_details od ON od.order_id=o.order_id "
        f"WHERE {w} "
        f"ORDER BY o.created_at DESC LIMIT :l"), params).all()
    
    # deduplicate by order_no in python since group by might mess up sorting
    res = []
    seen = set()
    for r in rows:
        if r.order_no not in seen:
            seen.add(r.order_no)
            res.append({"order_no": r.order_no, "total": r.total, "channel": r.channel,
                        "store": r.store_id, "status": r.admin_status, "created_at": r.created_at,
                        "customer": r.full_name, "model": r.sku_type})
    return res
