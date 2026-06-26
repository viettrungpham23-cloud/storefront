import { useEffect, useState, Fragment, useCallback } from 'react'
import {
  X, Pencil, Save, IdCard, ShoppingBag, Wrench, Package, Images, Upload,
  History, Factory, Truck, Warehouse, ShoppingCart, Bike, CheckCircle2,
} from 'lucide-react'
import { api, API_BASE } from '../api'
import { vnd, vndShort, num, dateVN, dateTimeVN } from '../format'
import { Status, Loading, Avatar } from '../ui'

const GROUP_TONE = { 'Lẻ': 'blue', 'Học sinh': 'amber', 'Doanh nghiệp': 'indigo' }
const TABS = [
  ['profile', 'Hồ sơ', IdCard],
  ['purchases', 'Mua sắm', ShoppingBag],
  ['parts', 'Linh phụ kiện', Package],
  ['services', 'Bảo dưỡng', Wrench],
  ['images', 'Hình ảnh', Images],
]
const TL_ICON = { factory: Factory, po: History, truck: Truck, warehouse: Warehouse, sold: ShoppingCart }

export default function CustomerDetail({ cid, onClose, onSaved }) {
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('profile')

  useEffect(() => { api.customerDetail(cid).then(setD).catch(() => setD({ error: true })) }, [cid])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        {!d ? <Loading /> : d.error ? <div className="empty">Không tải được hồ sơ.</div> : (
          <>
            <div className="drawer-head">
              <Avatar name={d.profile.full_name} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{d.profile.full_name}</div>
                <div className="t-muted" style={{ fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="t-mono">{d.profile.customer_id}</span>
                  <span className={`badge ${GROUP_TONE[d.profile.customer_group] || 'gray'}`}>{d.profile.customer_group}</span>
                </div>
              </div>
              <button className="x-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={17} /></button>
            </div>

            <div style={{ padding: '12px 22px 0' }}>
              <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <Mini label="Đơn mua" value={num(d.summary.orders)} />
                <Mini label="Tổng chi tiêu" value={vndShort(d.summary.spend)} tone="#0a64b4" />
                <Mini label="Lần bảo dưỡng" value={num(d.summary.services)} tone="#10b981" />
                <Mini label="Mua phụ kiện" value={num(d.summary.parts)} tone="#f59e0b" />
              </div>
            </div>

            <div style={{ padding: '14px 22px 0' }}>
              <div className="tabs">
                {TABS.map(([k, label, Icon]) => (
                  <div key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
                    <Icon size={15} />{label}
                  </div>
                ))}
              </div>
            </div>

            <div className="drawer-body" style={{ paddingTop: 14 }}>
              {tab === 'profile' && <ProfileTab cid={cid} profile={d.profile} onSaved={() => { api.customerDetail(cid).then(setD); onSaved && onSaved() }} />}
              {tab === 'purchases' && <PurchasesTab cid={cid} />}
              {tab === 'parts' && <PartsTab cid={cid} />}
              {tab === 'services' && <ServicesTab cid={cid} />}
              {tab === 'images' && <ImagesTab cid={cid} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Hồ sơ (biểu mẫu đầy đủ, sửa & lưu) ---------- */
function ProfileTab({ cid, profile, onSaved }) {
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(profile)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.customerUpdate(cid, {
        full_name: form.full_name, cccd_number: form.cccd_number, delivery_address: form.delivery_address,
        cccd_address: form.cccd_address, phone: form.phone, email: form.email,
        customer_group: form.customer_group, dob: form.dob, facebook: form.facebook,
        zalo: form.zalo, note: form.note,
      })
      setMsg({ ok: true, text: r.message }); setEdit(false); onSaved && onSaved()
    } catch (e) { setMsg({ ok: false, text: e.response?.data?.detail || 'Lỗi lưu hồ sơ' }) }
    setBusy(false)
  }

  const fp = { form, set, edit }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14 }}>Thông tin khách hàng</h3>
        <div style={{ flex: 1 }} />
        {!edit ? <button className="btn ghost" onClick={() => setEdit(true)}><Pencil size={15} /> Chỉnh sửa</button>
          : <button className="btn green" disabled={busy} onClick={save}><Save size={15} /> {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>}
      </div>
      {msg && <div className="banner" style={{ marginBottom: 12, background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: msg.ok ? '#047857' : '#b91c1c' }}>
        {msg.ok ? <CheckCircle2 size={16} /> : <X size={16} />}<b>{msg.text}</b></div>}
      <div className="form-grid">
        <div><label className="field-label">Mã khách hàng</label><input className="input" disabled value={profile.customer_id} /></div>
        <Field {...fp} label="Họ và tên" k="full_name" />
        <Field {...fp} label="Phân loại" k="customer_group" as="group" />
        <Field {...fp} label="Số điện thoại" k="phone" />
        <Field {...fp} label="Ngày sinh" k="dob" type="date" />
        <Field {...fp} label="Số căn cước công dân" k="cccd_number" />
        <Field {...fp} label="Email" k="email" />
        <Field {...fp} label="Facebook" k="facebook" />
        <Field {...fp} label="Zalo" k="zalo" />
        <Field {...fp} label="Địa chỉ liên hệ" k="delivery_address" full as="textarea" />
        <Field {...fp} label="Địa chỉ trên CCCD" k="cccd_address" full as="textarea" />
        <Field {...fp} label="Ghi chú" k="note" full as="textarea" />
      </div>
      <div className="t-muted" style={{ fontSize: 11.5, marginTop: 12 }}>
        Hồ sơ được tự động ghi vào thư mục riêng <code>customer_db/profiles/{profile.customer_id}.json</code> khi lưu.
      </div>
    </div>
  )
}

function Field({ form, set, edit, label, k, type, full, as }) {
  return (
    <div className={full ? 'full' : ''}>
      <label className="field-label">{label}</label>
      {as === 'textarea'
        ? <textarea className="textarea" rows={2} disabled={!edit} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />
        : as === 'group'
        ? <select className="select" disabled={!edit} value={form[k] || 'Lẻ'} onChange={(e) => set(k, e.target.value)}>
            {['Lẻ', 'Học sinh', 'Doanh nghiệp'].map((g) => <option key={g}>{g}</option>)}
          </select>
        : <input className="input" type={type || 'text'} disabled={!edit} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />}
    </div>
  )
}

/* ---------- Mua sắm + truy xuất nguồn gốc xe ---------- */
function PurchasesTab({ cid }) {
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  const [prov, setProv] = useState({})
  useEffect(() => { api.customerPurchases(cid).then(setRows) }, [cid])
  if (!rows) return <Loading />
  if (rows.length === 0) return <div className="empty">Chưa có lịch sử mua xe.</div>

  const toggle = (vin) => {
    if (open === vin) { setOpen(null); return }
    setOpen(vin)
    if (!prov[vin]) api.provenance(vin).then((p) => setProv((s) => ({ ...s, [vin]: p })))
  }

  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Thời gian</th><th>Mẫu mã</th><th>Số VIN (mã xe)</th><th className="t-right">Giá trị</th><th>Trạng thái</th><th>Nguồn gốc</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.order_no}>
                <tr>
                  <td className="t-mono" style={{ fontSize: 12 }}>{dateVN(r.date)}</td>
                  <td className="t-strong"><Bike size={13} style={{ verticalAlign: -2, marginRight: 5, color: '#64748b' }} />{r.model} <span className="t-muted">{r.color}</span></td>
                  <td className="vin">{r.vin}</td>
                  <td className="t-right t-mono t-strong">{vnd(r.total)}</td>
                  <td><Status value={r.status} /></td>
                  <td><button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => toggle(r.vin)}><History size={13} /> {open === r.vin ? 'Ẩn' : 'Xem'}</button></td>
                </tr>
                {open === r.vin && (
                  <tr><td colSpan={6} style={{ background: '#f7faff' }}>
                    {!prov[r.vin] ? <Loading label="Đang truy xuất…" /> : <Provenance p={prov[r.vin]} />}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Provenance({ p }) {
  const v = p.vehicle
  return (
    <div style={{ padding: '6px 4px' }}>
      <div style={{ fontSize: 12.5, marginBottom: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span><b>Số khung:</b> <span className="vin">{v.frame}</span></span>
        <span><b>Số máy:</b> <span className="vin">{v.engine || '—'}</span></span>
        {v.battery && <span><b>Số pin:</b> <span className="vin">{v.battery}</span></span>}
      </div>
      <div className="timeline">
        {p.timeline.map((s, i) => {
          const Ic = TL_ICON[s.icon] || History
          return (
            <div className="tl-item" key={i}>
              <div className="tl-dot" />
              <div className="tl-stage"><Ic size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{s.stage}</div>
              <div className="tl-title">{s.title}</div>
              <div className="tl-detail">{s.detail}</div>
              {s.date && <div className="tl-date">{s.date.includes('T') ? dateTimeVN(s.date) : dateVN(s.date)}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Linh phụ kiện ---------- */
function PartsTab({ cid }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { api.customerParts(cid).then(setRows) }, [cid])
  if (!rows) return <Loading />
  if (rows.length === 0) return <div className="empty">Chưa có lịch sử mua linh phụ kiện.</div>
  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Thời gian</th><th>Tên hàng</th><th>Phân loại</th><th className="t-right">SL</th><th className="t-right">Đơn giá</th><th className="t-right">Thành tiền</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="t-mono" style={{ fontSize: 12 }}>{dateVN(r.date)}</td>
                <td className="t-strong">{r.name}</td>
                <td><span className="badge amber">{r.category}</span></td>
                <td className="t-right">{r.qty}</td>
                <td className="t-right t-mono">{vnd(r.unit_price)}</td>
                <td className="t-right t-mono t-strong">{vnd(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Bảo dưỡng ---------- */
function ServicesTab({ cid }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { api.customerServices(cid).then(setRows) }, [cid])
  if (!rows) return <Loading />
  if (rows.length === 0) return <div className="empty">Chưa có lịch sử bảo dưỡng.</div>
  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Phiếu</th><th>Ngày</th><th>Loại dịch vụ</th><th>Số km</th><th>KTV</th><th className="t-right">Chi phí</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="t-mono t-strong">{r.service_no}</td>
                <td className="t-mono" style={{ fontSize: 12 }}>{dateVN(r.date)}</td>
                <td><div className="t-strong">{r.type}</div><div className="t-muted" style={{ fontSize: 11 }}>{r.description}</div></td>
                <td className="t-mono">{num(r.odometer)} km</td>
                <td className="t-muted" style={{ fontSize: 12 }}>{r.technician}</td>
                <td className="t-right t-mono t-strong">{vnd(r.cost)}</td>
                <td>{r.status === 'scheduled' ? <span className="badge amber">Đã hẹn</span> : <span className="badge green">Hoàn tất</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Hình ảnh (upload + gallery, lưu SVG theo nhóm) ---------- */
const IMG_GROUPS = ['CCCD', 'VNeID', 'Xe', 'Hop_dong', 'Khac']
function ImagesTab({ cid }) {
  const [groups, setGroups] = useState(null)
  const [group, setGroup] = useState('CCCD')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const load = useCallback(() => api.customerImages(cid).then(setGroups), [cid])
  useEffect(() => { load() }, [load])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      setBusy(true); setMsg(null)
      try {
        await api.customerUploadImage(cid, { group, filename: file.name, data_url: reader.result })
        setMsg({ ok: true, text: 'Đã lưu ảnh (định dạng SVG) vào customer_db/' })
        load()
      } catch { setMsg({ ok: false, text: 'Lỗi upload ảnh' }) }
      setBusy(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <label className="field-label" style={{ margin: 0 }}>Nhóm ảnh:</label>
        <select className="select" value={group} onChange={(e) => setGroup(e.target.value)}>
          {IMG_GROUPS.map((g) => <option key={g} value={g}>{g === 'Hop_dong' ? 'Hợp đồng' : g === 'Khac' ? 'Khác' : g}</option>)}
        </select>
        <label className="btn" style={{ cursor: 'pointer' }}>
          <Upload size={15} /> {busy ? 'Đang tải…' : 'Tải ảnh lên'}
          <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
        </label>
      </div>
      <label className="upload-zone" style={{ display: 'block', marginBottom: 16 }}>
        <Upload size={20} style={{ marginBottom: 6 }} /><br />
        Chọn / chụp ảnh CCCD, xe, hợp đồng… — tự động lưu định dạng <b>.svg</b>, chia theo nhóm
        <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
      </label>
      {msg && <div className="banner" style={{ marginBottom: 14, background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: msg.ok ? '#047857' : '#b91c1c' }}>
        {msg.ok ? <CheckCircle2 size={16} /> : <X size={16} />}<b>{msg.text}</b></div>}

      {!groups ? <Loading /> : groups.length === 0 ? <div className="empty">Chưa có ảnh đính kèm. Hãy tải ảnh lên.</div> : (
        groups.map((g) => (
          <div key={g.group} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Images size={15} color="#0a64b4" /> {g.group === 'Hop_dong' ? 'Hợp đồng' : g.group} <span className="t-muted" style={{ fontSize: 11.5, fontWeight: 500 }}>({g.images.length})</span>
            </div>
            <div className="gallery">
              {g.images.map((im) => (
                <div className="ph" key={im.name}>
                  <a href={im.data_url || API_BASE + im.url} target="_blank" rel="noreferrer">
                    <img src={im.data_url || API_BASE + im.url} alt={im.name} />
                  </a>
                  <div className="cap">{im.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function Mini({ label, value, tone = '#0f172a' }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 13px' }}>
      <div className="t-muted" style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  )
}
