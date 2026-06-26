import { useCallback, useEffect, useState } from 'react'
import { Search, Eye } from 'lucide-react'
import { api } from '../api'
import { vnd, num } from '../format'
import { Card, Pager, Loading, Avatar } from '../ui'
import { ApiError } from './Overview'
import CustomerDetail from './CustomerDetail'

const GROUPS = [['all', 'Tất cả'], ['Lẻ', 'Khách lẻ'], ['Học sinh', 'Học sinh'], ['Doanh nghiệp', 'Doanh nghiệp']]
const GROUP_TONE = { 'Lẻ': 'blue', 'Học sinh': 'amber', 'Doanh nghiệp': 'indigo' }
const COLORS = ['#0a64b4', '#10b981', '#6366f1', '#f59e0b', '#ec4899']

export default function Customers() {
  const [group, setGroup] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const reload = useCallback(() =>
    api.customers({ group, q, page, page_size: 12 }).then(setData).catch((e) => setErr(e.message)),
    [group, q, page],
  )
  useEffect(() => {
    const t = setTimeout(reload, q ? 280 : 0)
    return () => clearTimeout(t)
  }, [reload, q])

  if (err) return <ApiError msg={err} />

  return (
    <div className="grid fade-in">
      <Card title="Khách hàng" sub={data ? `${num(data.total)} khách hàng` : '…'}
        right={
          <div className="search" style={{ width: 260 }}>
            <Search size={15} />
            <input placeholder="Tìm tên, SĐT, mã KH…" value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          </div>
        }
        bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '14px 20px 4px' }}>
          <div className="filters">
            {GROUPS.map(([v, l]) => (
              <button key={v} className={`chip ${group === v ? 'active' : ''}`}
                onClick={() => { setGroup(v); setPage(1) }}>{l}</button>
            ))}
          </div>
        </div>
        {!data ? <Loading /> : (
          <>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Mã KH</th><th>Khách hàng</th><th>Điện thoại</th><th>Nhóm</th><th>Địa chỉ</th><th className="t-right">Số đơn</th><th className="t-right">Tổng chi tiêu</th><th></th></tr></thead>
                <tbody>
                  {data.items.map((c, i) => (
                    <tr key={c.customer_id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(c.customer_id)}>
                      <td className="t-mono t-muted">{c.customer_id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={c.name} color={COLORS[i % COLORS.length]} />
                          <span className="t-strong">{c.name}</span>
                        </div>
                      </td>
                      <td className="t-mono">{c.phone}</td>
                      <td><span className={`badge ${GROUP_TONE[c.group] || 'gray'}`}>{c.group}</span></td>
                      <td className="t-muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</td>
                      <td className="t-right t-strong">{c.orders}</td>
                      <td className="t-right t-strong t-mono">{vnd(c.spend)}</td>
                      <td className="t-right" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-act tip" data-tip="Chi tiết" onClick={() => setDetailId(c.customer_id)}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.items.length === 0 && <tr><td colSpan={8} className="empty">Không tìm thấy khách hàng.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
      {detailId && <CustomerDetail cid={detailId} onClose={() => setDetailId(null)} onSaved={reload} />}
    </div>
  )
}
