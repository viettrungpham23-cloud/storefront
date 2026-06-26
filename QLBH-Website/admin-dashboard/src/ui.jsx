import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'

export function Card({ title, sub, right, children, bodyStyle, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || right) && (
        <div className="card-head">
          {title && <div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>}
          <div className="spacer" />
          {right}
        </div>
      )}
      <div className="card-body" style={bodyStyle}>{children}</div>
    </div>
  )
}

export function Kpi({ icon, label, value, accent, trend, meta }) {
  return (
    <div className="kpi" style={{ '--accent': accent }}>
      <div className="kpi-top">
        <div className="kpi-ic" style={{ background: accent }}>{icon}</div>
        {trend != null && (
          <span className={`trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {(trend > 0 ? '+' : '') + trend + '%'}
          </span>
        )}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {meta && <div className="kpi-meta">{meta}</div>}
    </div>
  )
}

const STATUS = {
  completed: ['green', 'Hoàn tất'],
  vin_verified: ['blue', 'Đã đối soát VIN'],
  pending: ['amber', 'Chờ duyệt'],
  cancelled: ['red', 'Đã hủy'],
  available: ['green', 'Sẵn sàng'],
  reserved: ['amber', 'Giữ hàng'],
  sold: ['gray', 'Đã bán'],
  paid: ['green', 'Đã thu'],
  deposit: ['amber', 'Đặt cọc'],
  unpaid: ['gray', 'Chưa thu'],
}
export function Status({ value }) {
  const [tone, label] = STATUS[value] || ['gray', value]
  return <span className={`badge ${tone}`}><span className="d" />{label}</span>
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="pager">
      <span>Hiển thị <b>{from}–{to}</b> trên <b>{total.toLocaleString('vi-VN')}</b></span>
      <div className="spacer" />
      <button className="pg-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button>
      <span style={{ minWidth: 84, textAlign: 'center' }}>Trang {page}/{pages}</span>
      <button className="pg-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button>
    </div>
  )
}

export function Loading({ label = 'Đang tải dữ liệu…' }) {
  return <div className="loading"><div className="spinner" />{label}</div>
}

export function Avatar({ name, color = '#0a64b4' }) {
  const ini = (name || '?').trim().split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: color, color: '#fff', fontSize: 11, fontWeight: 700,
      display: 'inline-grid', placeItems: 'center',
    }}>{ini}</span>
  )
}
