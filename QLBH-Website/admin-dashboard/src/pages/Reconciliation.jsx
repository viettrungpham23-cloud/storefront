import { useEffect, useState, useMemo } from 'react'
import { ScanLine, CheckCircle2, XCircle, ShieldCheck, Bike, User, Hash, Search, Printer, CreditCard } from 'lucide-react'

const STATUSES = [['all', 'Tất cả trạng thái'], ['pending', 'Chờ duyệt'], ['vin_verified', 'Đã đối soát']]
const STORES = [['all', 'Mọi cơ sở'], ['TA1', 'TA1'], ['TA2', 'TA2'], ['TA3', 'TA3']]
import { api } from '../api'
import { vnd, dateTimeVN } from '../format'
import { Card, Status, Loading } from '../ui'
import { ApiError } from './Overview'
import { printReceipt } from '../utils/print'
import CustomerDetail from './CustomerDetail'
import { X } from 'lucide-react'

export default function Reconciliation({ setTab }) {
  const [orders, setOrders] = useState(null)
  const [recon, setRecon] = useState([])
  const [sel, setSel] = useState(null)
  const [frame, setFrame] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const [status, setStatus] = useState('all')
  const [store, setStore] = useState('all')
  const [sortDir, setSortDir] = useState('desc')
  const [q, setQ] = useState('')

  // Ghép xe (Assign VIN) state
  const [availVins, setAvailVins] = useState([])
  const [selVin, setSelVin] = useState('')

  // Thanh toán state
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản')

  // Mở modal sửa khách hàng
  const [editCustomer, setEditCustomer] = useState(null)
  
  // Widget chọn xe
  const [showVehicleWidget, setShowVehicleWidget] = useState(false)

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    let arr = orders
    if (status !== 'all') arr = arr.filter(o => o.admin_status === status)
    if (store !== 'all') arr = arr.filter(o => o.store === store)
    if (q.trim()) {
      const qs = q.toLowerCase()
      arr = arr.filter(o => o.order_no?.toLowerCase().includes(qs) || o.customer?.toLowerCase().includes(qs) || o.phone?.includes(qs) || o.vin_code?.toLowerCase().includes(qs))
    }
    arr = [...arr].sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at)
      return sortDir === 'desc' ? -cmp : cmp
    })
    return arr
  }, [orders, status, store, q, sortDir])

  const load = () => {
    api.pendingOrders().then((o) => { 
      setOrders(o)
      if (o.length > 0 && !sel) pick(o[0]) 
      else if (sel) {
        const upd = o.find(x => x.order_no === sel.order_no)
        if (upd) pick(upd)
        else pick(o[0])
      }
    }).catch((e) => setErr(e.message))
    api.reconciliation().then(setRecon).catch(() => {})
  }
  useEffect(load, [])

  useEffect(() => {
    if (sel && !sel.vin_code) {
      api.getAvailableVins(sel.model).then(setAvailVins).catch(() => setAvailVins([]))
    }
  }, [sel?.order_no, sel?.vin_code])

  const pick = (o) => { 
    setSel(o); setFrame(''); setMsg(null); setSelVin(''); 
    setPaymentMethod('Chuyển khoản');
  }

  const verify = async () => {
    if (!sel || !frame.trim()) return
    setBusy(true); setMsg(null)
    try {
      const r = await api.verify(sel.order_no, frame.trim())
      setMsg({ ok: true, text: r.message })
      load()
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'Lỗi kết nối máy chủ' })
    }
    setBusy(false)
  }

  const handleAssignVin = async () => {
    if (!sel || !selVin) return
    setBusy(true); setMsg(null)
    try {
      const r = await api.assignVin(sel.order_no, selVin)
      setMsg({ ok: true, text: r.message })
      load()
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'Lỗi ghép xe' })
    }
    setBusy(false)
  }

  const handleFinalize = async () => {
    if (!sel) return
    setBusy(true); setMsg(null)
    try {
      const r = await api.finalizeOrder(sel.order_no, paymentMethod)
      setMsg({ ok: true, text: r.message })
      setTimeout(() => load(), 1500)
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'Lỗi hoàn tất đơn' })
    }
    setBusy(false)
  }

  if (err) return <ApiError msg={err} />
  if (!orders) return <Loading />

  return (
    <div className="grid fade-in" style={{ gap: 20 }}>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <SumCard accent="#0a64b4" label="Đơn chờ xử lý" value={orders.length} icon={<ScanLine size={19} />} />
        {recon.map((r) => (
          <SumCard key={r.status}
            accent={r.status === 'matched' ? '#10b981' : r.status === 'unreconciled' ? '#f59e0b' : '#ef4444'}
            label={r.label} value={r.count.toLocaleString('vi-VN')}
            sub={vnd(r.amount)} icon={<ShieldCheck size={19} />} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 20, alignItems: 'start' }}>
        <Card title="Đơn chờ đối soát & thanh toán" sub={`${filteredOrders.length} đơn hiển thị`} bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="search" style={{ width: '100%' }}>
              <Search size={15} />
              <input placeholder="Tìm mã đơn, tên, SĐT, VIN…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="select" style={{ flex: 1 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="select" style={{ flex: 1 }} value={store} onChange={(e) => setStore(e.target.value)}>
                {STORES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="select" style={{ flex: 1 }} value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Mới nhất</option>
                <option value="asc">Cũ nhất</option>
              </select>
            </div>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filteredOrders.length === 0 && <div className="empty">Không có đơn nào phù hợp. 🎉</div>}
            {filteredOrders.map((o) => (
              <button key={o.order_no} onClick={() => pick(o)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: sel?.order_no === o.order_no ? '#f0f7ff' : 'transparent',
                  boxShadow: sel?.order_no === o.order_no ? 'inset 0 0 0 1.5px rgba(10,100,180,.28)' : 'none',
                  padding: '13px 18px', borderBottom: '1px solid var(--line-2)',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b className="t-mono" style={{ fontSize: 13 }}>{o.order_no}</b>
                  <Status value={!o.vin_code ? 'no_vin' : o.admin_status} />
                  <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 13, color: 'var(--vf-blue)' }}>{vnd(o.total)}</span>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>{o.customer} · {o.model} {o.color}</div>
                <div className="t-muted" style={{ fontSize: 11 }}>{o.store} · {dateTimeVN(o.created_at)}</div>
              </button>
            ))}
          </div>
        </Card>

        {sel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Nếu đơn chưa có số khung -> Giao diện GHÉP XE */}
            {!sel.vin_code ? (
              <Card title="Chờ Ghép Xe" sub="Đơn hàng này chưa có số khung (Backorder)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <Field icon={<User size={15} />} label="Khách hàng" value={sel.customer} sub={sel.phone} />
                  <Field icon={<Bike size={15} />} label="Xe khách đặt" value={sel.model} sub={sel.order_no} />
                </div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Chọn xe rảnh trong kho</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <select className="select" style={{ flex: 1 }} value={selVin} onChange={(e) => setSelVin(e.target.value)}>
                    <option value="">-- Chọn số khung --</option>
                    {availVins.map(v => (
                      <option key={v.vin} value={v.vin}>{v.frame} ({v.color || 'Không rõ màu'})</option>
                    ))}
                  </select>
                  <button className="btn green" disabled={busy || !selVin} onClick={handleAssignVin}>Ghép xe</button>
                </div>
                {msg && <Banner msg={msg} />}
              </Card>
            ) : sel.admin_status === 'pending' ? (
              /* Giao diện ĐỐI SOÁT */
              <Card title="Đối soát & Duyệt xuất kho" sub="Kiểm tra số khung thực tế khớp hệ thống"
                right={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => setEditCustomer(sel.customer_id)}>Thay đổi KH</button>
                    <button className="btn" onClick={() => setShowVehicleWidget(true)}>Thay đổi xe</button>
                  </div>
                }>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <Field icon={<User size={15} />} label="Khách hàng" value={sel.customer} sub={sel.phone} />
                  <Field icon={<Bike size={15} />} label="Xe đặt" value={`${sel.model} ${sel.color || ''}`} sub={sel.order_no} />
                  <Field icon={<Hash size={15} />} label="Số khung hệ thống" value={sel.frame_number} mono />
                  <Field icon={<ShieldCheck size={15} />} label="Tổng phải thu" value={vnd(sel.total)} />
                </div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Nhập / quét số khung thực tế</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <input className="input" style={{ flex: 1, fontFamily: 'ui-monospace, monospace' }}
                    placeholder="Quét mã vạch hoặc nhập VF…" value={frame}
                    onChange={(e) => setFrame(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verify()} />
                  <button className="btn green" disabled={busy || !frame.trim()} onClick={verify}>
                    <ScanLine size={16} /> {busy ? 'Đang duyệt…' : 'Đối soát'}
                  </button>
                </div>
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Mẹo demo: bấm để điền nhanh số khung đúng →{' '}
                  <button className="chip" style={{ padding: '3px 10px', fontSize: 11.5 }} onClick={() => setFrame(sel.frame_number)}>Điền số khung khớp</button>
                </div>
                {msg && <Banner msg={msg} />}
              </Card>
            ) : (
              /* Giao diện THANH TOÁN & IN PHIẾU */
              <Card title="Thanh Toán & Hoàn Tất" sub="Xe đã đối soát thành công">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <Field icon={<User size={15} />} label="Khách hàng" value={sel.customer} sub={sel.phone} />
                  <Field icon={<Bike size={15} />} label="Đã bàn giao xe" value={`${sel.model} ${sel.color || ''}`} sub={`Khung: ${sel.frame_number}`} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field icon={<ShieldCheck size={15} />} label="Tổng số tiền" value={vnd(sel.total)} />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 10 }}>Phương thức thanh toán</label>
                  <select className="select" style={{ width: '100%', marginBottom: 16 }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Chuyển khoản">Chuyển khoản ngân hàng (VietQR)</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Trả góp">Trả góp</option>
                  </select>

                  {paymentMethod === 'Chuyển khoản' && (
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                      <img 
                        src={`https://img.vietqr.io/image/970436-2057489999-compact.png?amount=${sel.total}&addInfo=${sel.order_no}&accountName=CTCP THUONG MAI MTA VIET NAM`} 
                        alt="VietQR" 
                        style={{ width: 140, height: 140, objectFit: 'contain' }} 
                      />
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Quét mã QR để thanh toán:</div>
                        <b style={{ fontSize: 16, display: 'block', marginTop: 4 }}>{vnd(sel.total)}</b>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8 }}>Ngân hàng: <b>Vietcombank</b></div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>STK: <b>2057489999</b></div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>Tên TK: <b>CTCP THUONG MAI MTA VIET NAM</b></div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>Nội dung: <b>{sel.order_no}</b></div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => printReceipt(sel)}>
                      <Printer size={16} /> In Phiếu Bán Hàng
                    </button>
                    <button className="btn green" style={{ flex: 1, justifyContent: 'center' }} disabled={busy} onClick={handleFinalize}>
                      <CheckCircle2 size={16} /> Hoàn tất đơn hàng
                    </button>
                  </div>
                  {msg && <Banner msg={msg} />}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {editCustomer && <CustomerDetail cid={editCustomer} onClose={() => setEditCustomer(null)} onSaved={load} />}
      
      {showVehicleWidget && (
        <SelectVehicleModal 
          currentStore={sel?.store} 
          onClose={() => setShowVehicleWidget(false)} 
          onSelect={async (vin) => {
            setBusy(true); setMsg(null);
            try {
              const r = await api.assignVin(sel.order_no, vin)
              setMsg({ ok: true, text: r.message })
              setShowVehicleWidget(false)
              load()
            } catch (e) {
              setMsg({ ok: false, text: e.response?.data?.detail || 'Lỗi đổi xe' })
            }
            setBusy(false)
          }} 
        />
      )}
    </div>
  )
}

function SelectVehicleModal({ currentStore, onClose, onSelect }) {
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [models, setModels] = useState([])
  const [model, setModel] = useState('all')

  useEffect(() => {
    api.inventoryModels().then(setModels).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      api.inventory({ status: 'available', store: 'all', model, q, page: 1, page_size: 50 })
        .then(setData).catch(console.error)
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, model])

  return (
    <div className="overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="card fade-in" style={{ width: '90%', maxWidth: 800, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Chọn xe từ kho</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10 }}>
          <div className="search" style={{ flex: 1 }}>
            <Search size={15} />
            <input placeholder="Tìm VIN, số máy..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="select" value={model} onChange={e => setModel(e.target.value)}>
            <option value="all">Mọi dòng xe</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 20px' }}>
          {!data ? <Loading /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {data.items.map(it => (
                <div key={it.vin} onClick={() => onSelect(it.vin)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, cursor: 'pointer', transition: 'border-color .2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--vf-blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{it.model} - {it.color}</div>
                  <div className="t-mono t-muted" style={{ fontSize: 12, marginBottom: 4 }}>VIN: {it.vin}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Cơ sở: <span className="badge gray">{it.store}</span></div>
                </div>
              ))}
              {data.items.length === 0 && <div className="empty" style={{ gridColumn: '1 / -1' }}>Không có xe khả dụng.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SumCard({ accent, label, value, sub, icon }) {
  return (
    <div className="kpi" style={{ '--accent': accent }}>
      <div className="kpi-top"><div className="kpi-ic" style={{ background: accent }}>{icon}</div></div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-meta">{sub}</div>}
    </div>
  )
}

function Field({ icon, label, value, sub, mono }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{icon}{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, fontFamily: mono ? 'ui-monospace, monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</div>
      {sub && <div className="t-muted" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function Banner({ msg }) {
  if (!msg) return null
  return (
    <div className="banner" style={{ marginTop: 16, background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: msg.ok ? '#047857' : '#b91c1c' }}>
      {msg.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}<b>{msg.text}</b>
    </div>
  )
}
