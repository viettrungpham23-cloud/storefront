import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../api'
import { vnd, dateTimeVN } from '../format'
import { Card, Status, Pager, Loading } from '../ui'
import { ApiError } from './Overview'

const STATUSES = [
  ['all', 'Tất cả'], ['completed', 'Hoàn tất'], ['vin_verified', 'Đã đối soát'],
  ['pending', 'Chờ duyệt'],
]
const STORES = [['all', 'Mọi cơ sở'], ['TA1', 'TA1'], ['TA2', 'TA2'], ['TA3', 'TA3']]

export default function Orders() {
  const [status, setStatus] = useState('all')
  const [store, setStore] = useState('all')
  const [sortDir, setSortDir] = useState('desc')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  const [selOrder, setSelOrder] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      api.orders({ status, store, q, sort_dir: sortDir, page, page_size: 12 })
        .then(setData).catch((e) => setErr(e.message))
    }, q ? 280 : 0)
    return () => clearTimeout(t)
  }, [status, store, q, sortDir, page])

  if (err) return <ApiError msg={err} />

  return (
    <div className="grid fade-in">
      <Card
        title="Danh sách đơn hàng"
        sub={data ? `${data.total.toLocaleString('vi-VN')} đơn` : '…'}
        right={
          <div className="search" style={{ width: 260 }}>
            <Search size={15} />
            <input placeholder="Tìm mã đơn, tên KH, SĐT, VIN…"
              value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          </div>
        }
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '14px 20px 4px', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <div className="filters">
            {STATUSES.map(([v, l]) => (
              <button key={v} className={`chip ${status === v ? 'active' : ''}`}
                onClick={() => { setStatus(v); setPage(1) }}>{l}</button>
            ))}
          </div>
          <div className="filters" style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <select className="select" value={sortDir} onChange={(e) => { setSortDir(e.target.value); setPage(1) }}>
              <option value="desc">Mới nhất</option>
              <option value="asc">Cũ nhất</option>
            </select>
            <select className="select" value={store} onChange={(e) => { setStore(e.target.value); setPage(1) }}>
              {STORES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {!data ? <Loading /> : (
          <>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Mã đơn</th><th>Khách hàng</th><th>Dòng xe</th><th>Cơ sở</th>
                    <th>Kênh</th><th className="t-right">Tổng tiền</th><th>Thanh toán</th>
                    <th>Trạng thái</th><th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.order_no} style={{ cursor: 'pointer' }} onClick={() => setSelOrder(o.order_no)} className="hoverable">
                      <td className="t-strong t-mono text-blue">{o.order_no}</td>
                      <td>{o.customer}<div className="t-muted" style={{ fontSize: 11.5 }}>{o.phone}</div></td>
                      <td>{o.model}</td>
                      <td><span className="badge gray">{o.store}</span></td>
                      <td className="t-muted">{o.channel}</td>
                      <td className="t-right t-strong t-mono">{vnd(o.total)}</td>
                      <td><Status value={o.payment_status} /></td>
                      <td><Status value={o.admin_status} /></td>
                      <td className="t-muted t-mono" style={{ fontSize: 12 }}>{dateTimeVN(o.created_at)}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && (
                    <tr><td colSpan={9} className="empty">Không có đơn hàng phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      {selOrder && <OrderDetailModal orderNo={selOrder} onClose={() => setSelOrder(null)} />}
      <style>{`
        .hoverable:hover td { background: #f8fafc; }
        .text-blue { color: var(--vf-blue); }
      `}</style>
    </div>
  )
}

function OrderDetailModal({ orderNo, onClose }) {
  const [detail, setDetail] = useState(null)
  
  useEffect(() => {
    api.orderDetail(orderNo).then(setDetail).catch(console.error)
  }, [orderNo])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card fade-in" style={{ width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Chi tiết đơn hàng {orderNo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>
        
        {!detail ? <Loading /> : (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-2)' }}>Thông tin chung</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: 13.5 }}>
                  <div className="t-muted">Thời gian:</div><div className="t-mono">{dateTimeVN(detail.created_at)}</div>
                  <div className="t-muted">Kênh:</div><div>{detail.channel}</div>
                  <div className="t-muted">Cơ sở:</div><div>{detail.store}</div>
                  <div className="t-muted">Trạng thái:</div><div><Status value={detail.admin_status} /></div>
                  <div className="t-muted">Thanh toán:</div><div><Status value={detail.payment_status} /></div>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-2)' }}>Khách hàng</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: 13.5 }}>
                  <div className="t-muted">Họ tên:</div><div className="t-strong">{detail.customer?.name}</div>
                  <div className="t-muted">SĐT:</div><div>{detail.customer?.phone}</div>
                  <div className="t-muted">CCCD:</div><div>{detail.customer?.cccd || '—'}</div>
                  <div className="t-muted">Địa chỉ:</div><div>{detail.customer?.address || '—'}</div>
                </div>
              </div>
            </div>

            {detail.vehicle && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-2)' }}>Thông tin xe</h4>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13.5 }}>
                  <div><span className="t-muted">Số khung:</span> <b className="t-mono">{detail.vehicle.vin}</b></div>
                  <div><span className="t-muted">Dòng xe:</span> <b>{detail.vehicle.model}</b></div>
                  <div><span className="t-muted">Màu sắc:</span> <b>{detail.vehicle.color}</b></div>
                  <div><span className="t-muted">Số máy:</span> <span className="t-mono">{detail.vehicle.engine || '—'}</span></div>
                </div>
              </div>
            )}

            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-2)' }}>Sản phẩm & Dịch vụ</h4>
              <table className="tbl" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Mặt hàng</th>
                    <th className="t-right">Đơn giá</th>
                    <th className="t-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.details || []).map((d, i) => (
                    <tr key={i}>
                      <td>
                        <div className="t-strong">{d.model || d.service || 'Sản phẩm'}</div>
                        {d.promo && <div className="t-muted" style={{ fontSize: 11 }}>Khuyến mãi: {d.promo}</div>}
                      </td>
                      <td className="t-right t-mono">{vnd(d.unit_price)}</td>
                      <td className="t-right t-strong t-mono">{vnd(d.final_price)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={2} className="t-right t-strong" style={{ borderTop: '2px solid #e2e8f0' }}>Tổng cộng:</td>
                    <td className="t-right t-strong t-mono" style={{ borderTop: '2px solid #e2e8f0', color: 'var(--vf-blue)' }}>{vnd(detail.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
