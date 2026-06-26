import { useEffect, useState } from 'react'
import {
  PackagePlus, Truck, Clock, AlertTriangle, Search, Factory, Store,
  Bike, Wrench, Gift, X, FileDown, ChevronRight, CheckCircle2, Boxes,
} from 'lucide-react'
import { api } from '../api'
import { vndShort, num, dateVN } from '../format'
import { Card, Loading } from '../ui'
import { ApiError } from './Overview'

const GOODS = [['all', 'Tất cả loại'], ['vehicle', 'Xe'], ['vehicle_part', 'Linh kiện xe'], ['accessory', 'Phụ kiện đại lý']]
const SOURCES = [['all', 'Mọi nguồn'], ['factory', 'Nhà máy'], ['dealer', 'Đại lý khác']]
const STATUSES = [['all', 'Tất cả'], ['open', 'Chưa về'], ['partial', 'Về một phần'], ['completed', 'Đã đủ']]
const GOODS_ICON = { vehicle: Bike, vehicle_part: Wrench, accessory: Gift }
const PO_STATUS = { open: ['amber', 'Chưa về'], partial: ['blue', 'Về một phần'], completed: ['green', 'Đã đủ'] }

// Dữ liệu phiếu giao hàng mẫu (từ ảnh) cho nút "Nhập phiếu mẫu"
const SAMPLE = {
  delivery_no: '6012136459-2', po_no: '5011372342', received_date: '2026-06-24', vehicle_plate: '29H-1254',
  vins: ['RPXU3LCLHTT055001', 'RPXU3LCLHTT055002', 'RPXU3LCLHTT055003'],
}

export default function Procurement() {
  const [sum, setSum] = useState(null)
  const [source, setSource] = useState('all')
  const [goods, setGoods] = useState('all')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [detail, setDetail] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const reloadAll = () => {
    api.poSummary().then(setSum).catch((e) => setErr(e.message))
    api.poList({ source, goods_type: goods, status, q }).then(setRows).catch((e) => setErr(e.message))
  }
  useEffect(() => { api.poSummary().then(setSum).catch((e) => setErr(e.message)) }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      api.poList({ source, goods_type: goods, status, q }).then(setRows).catch((e) => setErr(e.message))
    }, q ? 280 : 0)
    return () => clearTimeout(t)
  }, [source, goods, status, q])

  if (err) return <ApiError msg={err} />
  if (!sum) return <Loading />

  const t = sum.total

  return (
    <div className="grid fade-in" style={{ gap: 20 }}>
      {/* KPI */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <Kpi icon={<PackagePlus size={20} />} accent="#0a64b4" label="Tổng giá trị đã đặt"
          value={vndShort(t.ordered_value)} meta={`${num(t.ordered_qty)} đơn vị · ${t.orders} đơn`} />
        <Kpi icon={<Truck size={20} />} accent="#10b981" label="Đã nhận về"
          value={vndShort(t.received_value)} meta={`${num(t.received_qty)} đơn vị đã về kho`} />
        <Kpi icon={<Clock size={20} />} accent="#f59e0b" label="Đang chờ nhà máy trả"
          value={vndShort(t.pending_value)} meta={`${num(t.pending_qty)} đơn vị chưa về`} />
        <Kpi icon={<AlertTriangle size={20} />} accent="#ef4444" label="Đơn quá hạn (>30 ngày)"
          value={num(sum.overdue_orders)} meta="lô hàng chưa trả, tính aging" />
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 20 }}>
        <Card title="Theo nguồn nhập" sub="Giá trị đặt · đã về / chờ">
          <SourceRow icon={<Factory size={16} />} label="Nhà máy" color="#0a64b4" d={sum.by_source.factory} />
          <SourceRow icon={<Store size={16} />} label="Đại lý khác" color="#6366f1" d={sum.by_source.dealer} />
        </Card>

        <Card title="Theo loại hàng hóa" sub="Xe · Linh kiện · Phụ kiện">
          <GoodsRow icon={<Bike size={16} />} label="Xe (sync vào kho)" color="#0a64b4" d={sum.by_goods.vehicle} />
          <GoodsRow icon={<Wrench size={16} />} label="Linh kiện xe" color="#10b981" d={sum.by_goods.vehicle_part} />
          <GoodsRow icon={<Gift size={16} />} label="Phụ kiện đại lý" color="#f59e0b" d={sum.by_goods.accessory} />
        </Card>

        <Card title="Aging hàng chưa về" sub="Theo số ngày từ lúc duyệt lệnh">
          {sum.aging_buckets.map((b) => {
            const maxV = Math.max(1, ...sum.aging_buckets.map((x) => x.value))
            const tone = b.bucket === '>90' ? '#ef4444' : b.bucket === '61-90' ? '#f59e0b' : b.bucket === '31-60' ? '#f59e0b' : '#10b981'
            return (
              <div key={b.bucket} style={{ marginBottom: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12.5 }}>
                  <b>{b.bucket} ngày</b>
                  <span className="t-muted">{b.orders} đơn</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{vndShort(b.value)}</span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(b.value / maxV) * 100}%`, background: tone }} /></div>
              </div>
            )
          })}
        </Card>
      </div>

      {/* PO table */}
      <Card title="Đơn đặt hàng (PO)" sub={rows ? `${rows.length} đơn` : '…'}
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="search" style={{ width: 220 }}>
              <Search size={15} />
              <input placeholder="Tìm PO, NCC, mô tả…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn" onClick={() => setShowImport(true)}><FileDown size={16} /> Nhập phiếu giao hàng</button>
          </div>
        }
        bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '14px 20px 4px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="filters">
            {SOURCES.map(([v, l]) => <button key={v} className={`chip ${source === v ? 'active' : ''}`} onClick={() => setSource(v)}>{l}</button>)}
          </div>
          <div className="filters" style={{ marginLeft: 'auto' }}>
            <select className="select" value={goods} onChange={(e) => setGoods(e.target.value)}>
              {GOODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        {!rows ? <Loading /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr>
                <th>Mã PO</th><th>Nguồn</th><th>Nhà cung cấp</th><th>Hàng hóa</th>
                <th className="t-right">Đặt</th><th>Đã về / Chờ</th><th className="t-right">Giá trị đặt</th>
                <th>Ngày duyệt</th><th className="t-right">Aging</th><th>Trạng thái</th><th></th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const GIcon = GOODS_ICON[r.goods_type] || Boxes
                  return (
                    <tr key={r.po_no} style={{ cursor: 'pointer' }} onClick={() => api.poDetail(r.po_no).then(setDetail)}>
                      <td className="t-strong t-mono">{r.po_no}</td>
                      <td><span className={`badge ${r.source_type === 'factory' ? 'blue' : 'indigo'}`}>{r.source_label}</span></td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.supplier_name}</td>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><GIcon size={14} color="#64748b" />{r.goods_label}</span>
                        <div className="t-muted" style={{ fontSize: 11 }}>{r.description}</div></td>
                      <td className="t-right t-mono">{num(r.ordered_qty)}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${r.progress}%`, background: r.progress >= 100 ? '#10b981' : '#0a64b4' }} /></div>
                          <span className="t-mono" style={{ fontSize: 11.5, minWidth: 64 }}>{r.received_qty}/{r.ordered_qty}</span>
                        </div>
                      </td>
                      <td className="t-right t-mono t-strong">{vndShort(r.ordered_value)}</td>
                      <td className="t-muted t-mono" style={{ fontSize: 12 }}>{dateVN(r.approved_date)}</td>
                      <td className="t-right">{r.aging_days > 0 ? <span className={`badge ${r.aging_days > 90 ? 'red' : r.aging_days > 30 ? 'amber' : 'gray'}`}>{r.aging_days} ngày</span> : <span className="t-muted">—</span>}</td>
                      <td><span className={`badge ${PO_STATUS[r.status][0]}`}>{PO_STATUS[r.status][1]}</span></td>
                      <td><ChevronRight size={16} color="#cbd5e1" /></td>
                    </tr>
                  )
                })}
                {rows.length === 0 && <tr><td colSpan={11} className="empty">Không có đơn đặt hàng phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detail && <DetailDrawer detail={detail} onClose={() => setDetail(null)} />}
      {showImport && <ImportModal pos={rows || []} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); reloadAll() }} />}
    </div>
  )
}

/* ---------- Drawer chi tiết PO + các lô về ---------- */
function DetailDrawer({ detail, onClose }) {
  const o = detail.order
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>PO {o.po_no}</div>
            <div className="t-muted" style={{ fontSize: 12.5 }}>{o.description} · {o.supplier_name}</div>
          </div>
          <button className="x-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={17} /></button>
        </div>
        <div className="drawer-body">
          <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <MiniBox label="Đặt" value={num(o.ordered_qty)} sub={vndShort(o.ordered_value)} />
            <MiniBox label="Đã về" value={num(o.received_qty)} sub={`${o.progress}%`} tone="#10b981" />
            <MiniBox label="Chờ về" value={num(o.pending_qty)} sub={o.aging_days ? `aging ${o.aging_days}n` : '—'} tone="#f59e0b" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span className={`badge ${o.source_type === 'factory' ? 'blue' : 'indigo'}`}>{o.source_label}</span>
            <span className={`badge ${PO_STATUS[o.status][0]}`}>{PO_STATUS[o.status][1]}</span>
            <span className="t-muted">Duyệt lệnh: {dateVN(o.approved_date)}</span>
            <span className="t-muted" style={{ marginLeft: 'auto' }}>Giao đến: {o.deliver_to_unit}</span>
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }}>Các lô đã về ({detail.receipts.length} phiếu giao hàng)</div>
          {detail.receipts.length === 0 && <div className="empty">Nhà máy chưa trả lô nào. Đang chờ {o.pending_qty} đơn vị.</div>}
          {detail.receipts.map((r) => (
            <div className="card" key={r.delivery_no} style={{ boxShadow: 'none' }}>
              <div className="card-head" style={{ padding: '12px 16px' }}>
                <Truck size={16} color="#0a64b4" />
                <div>
                  <b style={{ fontSize: 13 }}>Phiếu {r.delivery_no}</b>
                  <div className="t-muted" style={{ fontSize: 11.5 }}>{dateVN(r.received_date)} · biển {r.vehicle_plate || '—'} · → {r.deliver_to_unit}</div>
                </div>
                <span className="badge green" style={{ marginLeft: 'auto' }}>{r.total_qty} mục</span>
              </div>
              {r.items.some((i) => i.vin) && (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Số VIN</th><th>Số pin</th><th>Số sạc</th></tr></thead>
                    <tbody>
                      {r.items.slice(0, 8).map((i, k) => (
                        <tr key={k}>
                          <td className="vin">{i.vin}</td>
                          <td className="vin" style={{ fontSize: 11 }}>{i.battery}</td>
                          <td className="vin" style={{ fontSize: 11 }}>{i.charger}</td>
                        </tr>
                      ))}
                      {r.items.length > 8 && <tr><td colSpan={3} className="t-muted" style={{ fontSize: 12 }}>… và {r.items.length - 8} mục khác</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Modal import phiếu giao hàng ---------- */
function ImportModal({ pos, onClose, onDone }) {
  const [form, setForm] = useState({ delivery_no: '', po_no: pos[0]?.po_no || '', received_date: '', vehicle_plate: '', vins: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const loadSample = () => setForm({
    delivery_no: SAMPLE.delivery_no, po_no: SAMPLE.po_no, received_date: SAMPLE.received_date,
    vehicle_plate: SAMPLE.vehicle_plate, vins: SAMPLE.vins.join('\n'),
  })

  const submit = async () => {
    setBusy(true); setMsg(null)
    const items = form.vins.split('\n').map((s) => s.trim()).filter(Boolean).map((vin) => ({ vin, frame_number: vin }))
    try {
      const r = await api.poImportReceipt({
        delivery_no: form.delivery_no, po_no: form.po_no, received_date: form.received_date || undefined,
        vehicle_plate: form.vehicle_plate, items,
      })
      setMsg({ ok: true, text: r.message })
      setTimeout(onDone, 900)
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'Lỗi import' })
    }
    setBusy(false)
  }

  return (
    <div className="overlay" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <FileDown size={18} color="#0a64b4" />
          <b>Nhập phiếu giao hàng (lô nhà máy trả về)</b>
          <button className="x-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={17} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="field-label">Số phiếu giao hàng</label><input className="input" style={{ width: '100%' }} value={form.delivery_no} onChange={(e) => set('delivery_no', e.target.value)} placeholder="6012136459" /></div>
            <div><label className="field-label">Thuộc đơn đặt (PO)</label>
              <select className="select" style={{ width: '100%' }} value={form.po_no} onChange={(e) => set('po_no', e.target.value)}>
                {pos.map((p) => <option key={p.po_no} value={p.po_no}>{p.po_no} — {p.description}</option>)}
              </select>
            </div>
            <div><label className="field-label">Ngày nhận</label><input className="input" type="date" style={{ width: '100%' }} value={form.received_date} onChange={(e) => set('received_date', e.target.value)} /></div>
            <div><label className="field-label">Biển số xe vận chuyển</label><input className="input" style={{ width: '100%' }} value={form.vehicle_plate} onChange={(e) => set('vehicle_plate', e.target.value)} placeholder="29H-1254" /></div>
          </div>
          <div>
            <label className="field-label">Danh sách số VIN (mỗi dòng một số) — xe sẽ tự sync vào kho</label>
            <textarea className="textarea" rows={5} value={form.vins} onChange={(e) => set('vins', e.target.value)} placeholder={'RPXU3LCLHTT052012\nRPXU3LCLHTT052016'} />
          </div>
          {msg && <div className="banner" style={{ background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: msg.ok ? '#047857' : '#b91c1c' }}>
            {msg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}<b>{msg.text}</b></div>}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={loadSample}>Nhập phiếu mẫu (từ ảnh)</button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>Hủy</button>
          <button className="btn green" disabled={busy || !form.delivery_no || !form.po_no} onClick={submit}>
            {busy ? 'Đang nhập…' : 'Nhập kho'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon, accent, label, value, meta }) {
  return (
    <div className="kpi" style={{ '--accent': accent }}>
      <div className="kpi-top"><div className="kpi-ic" style={{ background: accent }}>{icon}</div></div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {meta && <div className="kpi-meta">{meta}</div>}
    </div>
  )
}

function MiniBox({ label, value, sub, tone = '#0f172a' }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px' }}>
      <div className="t-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: tone }}>{value}</div>
      <div className="t-muted" style={{ fontSize: 11.5 }}>{sub}</div>
    </div>
  )
}

function SourceRow({ icon, label, color, d }) {
  const recvPct = d.ordered_value ? (d.received_value / d.ordered_value) * 100 : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
        <span style={{ color }}>{icon}</span><b>{label}</b>
        <span className="t-muted" style={{ fontSize: 11.5 }}>{d.orders} đơn</span>
        <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{vndShort(d.ordered_value)}</span>
      </div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${recvPct}%`, background: color }} /></div>
      <div className="t-muted" style={{ fontSize: 11, marginTop: 4 }}>Đã về {vndShort(d.received_value)} · chờ {vndShort(d.pending_value)}</div>
    </div>
  )
}

function GoodsRow({ icon, label, color, d }) {
  return (
    <div className="rank-row" style={{ borderBottom: '1px solid var(--line-2)' }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: color + '18', color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</span>
      <div className="nm">{label}<div className="t-muted" style={{ fontSize: 11 }}>{d.orders} đơn · {num(d.received_qty)}/{num(d.ordered_qty)} đv</div></div>
      <span className="vl">{vndShort(d.ordered_value)}</span>
    </div>
  )
}
