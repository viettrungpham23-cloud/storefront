import { useEffect, useState } from 'react'
import { Search, Boxes, CheckCircle2, Clock, ArchiveX, Upload } from 'lucide-react'
import { api } from '../api'
import { vnd, dateVN, num } from '../format'
import { Card, Status, Pager, Loading } from '../ui'
import { ApiError } from './Overview'

const STATUSES = [['all', 'Tất cả'], ['available', 'Sẵn sàng'], ['reserved', 'Giữ hàng'], ['sold', 'Đã bán']]
const STORES = [['all', 'Mọi cơ sở'], ['TA1', 'TA1'], ['TA2', 'TA2'], ['TA3', 'TA3'], ['KHO', 'Kho'], ['KHAC', 'Khác']]

export default function Inventory() {
  const [status, setStatus] = useState('all')
  const [store, setStore] = useState('all')
  const [model, setModel] = useState('all')
  const [color, setColor] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [models, setModels] = useState([])
  const [colors, setColors] = useState([])
  const [sum, setSum] = useState(null)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [bump, setBump] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  useEffect(() => {
    api.inventoryModels().then(setModels).catch(() => {})
    api.inventoryColors().then(setColors).catch(() => {})
    api.inventorySummary().then(setSum).catch((e) => setErr(e.message))
  }, [bump])

  useEffect(() => {
    const t = setTimeout(() => {
      api.inventory({ status, store, model, color, q, page, page_size: 12 })
        .then(setData).catch((e) => setErr(e.message))
    }, q ? 280 : 0)
    return () => clearTimeout(t)
  }, [status, store, model, color, q, page, bump])

  async function onImportCsv(e) {
    const f = e.target.files?.[0]
    e.target.value = ''  // cho phép chọn lại cùng 1 file
    if (!f) return
    setImporting(true); setImportMsg(null)
    try {
      const r = await api.inventoryImportCsv(f)
      setImportMsg({
        ok: true,
        text: `Đã nhập ${r.created} xe · bỏ qua ${r.skipped}` +
          (r.errors?.length ? ` · ${r.errors.length} dòng lỗi (vd dòng ${r.errors[0].row}: ${r.errors[0].error})` : ''),
      })
      setBump((b) => b + 1)
    } catch (er) {
      const detail = er?.response?.data?.detail || er.message
      setImportMsg({ ok: false, text: `Lỗi import: ${detail}` })
    } finally {
      setImporting(false)
    }
  }

  if (err) return <ApiError msg={err} />

  const totalAvail = sum ? sum.by_store.reduce((a, s) => a + (s.available || 0), 0) : 0
  const totalReserved = sum ? sum.by_store.reduce((a, s) => a + (s.reserved || 0), 0) : 0
  const totalSold = sum ? sum.by_store.reduce((a, s) => a + (s.sold || 0), 0) : 0

  return (
    <div className="grid fade-in" style={{ gap: 20 }}>
      {/* Summary strip */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <MiniStat icon={<Boxes size={19} />} accent="#0a64b4" label="Tổng số khung quản lý"
          value={sum ? num(totalAvail + totalReserved + totalSold) : '…'} />
        <MiniStat icon={<CheckCircle2 size={19} />} accent="#10b981" label="Sẵn sàng bán" value={num(totalAvail)} />
        <MiniStat icon={<Clock size={19} />} accent="#f59e0b" label="Đang giữ hàng" value={num(totalReserved)} />
        <MiniStat icon={<ArchiveX size={19} />} accent="#64748b" label="Đã xuất bán" value={num(totalSold)} />
      </div>

      {/* By store + low stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <Card title="Tồn kho theo cơ sở" sub="Phân bổ số khung theo trạng thái">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Cơ sở</th><th className="t-right">Sẵn sàng</th><th className="t-right">Giữ hàng</th><th className="t-right">Đã bán</th><th>Tỉ lệ luân chuyển</th></tr></thead>
              <tbody>
                {sum?.by_store.map((s) => {
                  const tot = (s.available || 0) + (s.reserved || 0) + (s.sold || 0)
                  const soldPct = tot ? Math.round((s.sold / tot) * 100) : 0
                  return (
                    <tr key={s.store}>
                      <td className="t-strong">{s.store}</td>
                      <td className="t-right" style={{ color: '#047857', fontWeight: 700 }}>{num(s.available || 0)}</td>
                      <td className="t-right" style={{ color: '#b45309' }}>{num(s.reserved || 0)}</td>
                      <td className="t-right t-muted">{num(s.sold || 0)}</td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${soldPct}%`, background: '#0a64b4' }} /></div>
                          <span className="t-mono" style={{ fontSize: 11.5 }}>{soldPct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Cảnh báo sắp hết hàng" sub="Dòng xe còn ≤ 5 xe">
          {!sum ? <Loading /> : sum.low_stock.length === 0 ? <div className="empty">Không có dòng xe nào sắp hết.</div> : (
            sum.low_stock.map((m) => (
              <div className="rank-row" key={m.model}>
                <span className="rk" style={{ background: '#fdecec', color: '#b91c1c' }}>{m.available}</span>
                <span className="nm">{m.model}</span>
                <span className="badge red" style={{ marginLeft: 'auto' }}>Sắp hết</span>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* VIN table */}
      <Card title="Sổ kho theo số khung (VIN)" sub={data ? `${num(data.total)} xe` : '…'}
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.6 : 1 }}
              title="Nhập kho từ file CSV (cột: model, color, vin, [engine, code, store, status, date_in, note])">
              <Upload size={15} />{importing ? 'Đang nhập…' : 'Import CSV'}
              <input type="file" accept=".csv,text/csv" hidden disabled={importing} onChange={onImportCsv} />
            </label>
            <div className="search" style={{ width: 240 }}>
              <Search size={15} />
              <input placeholder="Tìm VIN, số máy, mã hãng…" value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            </div>
          </div>
        }
        bodyStyle={{ padding: 0 }}>
        {importMsg && (
          <div style={{
            margin: '12px 20px 0', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: importMsg.ok ? '#ecfdf5' : '#fef2f2', color: importMsg.ok ? '#047857' : '#b91c1c',
            border: `1px solid ${importMsg.ok ? '#a7f3d0' : '#fecaca'}`,
          }}>{importMsg.text}</div>
        )}
        <div style={{ padding: '14px 20px 4px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="filters">
            {STATUSES.map(([v, l]) => (
              <button key={v} className={`chip ${status === v ? 'active' : ''}`}
                onClick={() => { setStatus(v); setPage(1) }}>{l}</button>
            ))}
          </div>
          <div className="filters" style={{ marginLeft: 'auto' }}>
            <select className="select" value={store} onChange={(e) => { setStore(e.target.value); setPage(1) }}>
              {STORES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="select" value={model} onChange={(e) => { setModel(e.target.value); setPage(1) }}>
              <option value="all">Mọi dòng xe</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="select" value={color} onChange={(e) => { setColor(e.target.value); setPage(1) }}>
              <option value="all">Mọi màu sắc</option>
              {colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {!data ? <Loading /> : (
          <>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Số khung (VIN)</th><th>Dòng xe</th><th>Màu</th><th>Số máy</th><th>Cơ sở</th><th>Ngày nhập</th><th>Trạng thái</th><th className="t-right">Giá niêm yết</th></tr></thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.vin}>
                      <td className="vin">{it.vin}</td>
                      <td className="t-strong">{it.model}</td>
                      <td><span className="color-chip" style={{ background: it.color_code || '#cbd5e1' }} />{it.color}</td>
                      <td className="vin">{it.engine || '—'}</td>
                      <td><span className="badge gray">{it.store}</span></td>
                      <td className="t-muted t-mono" style={{ fontSize: 12 }}>{dateVN(it.date_in)}</td>
                      <td><Status value={it.status} /></td>
                      <td className="t-right t-mono">{it.price ? vnd(it.price) : '—'}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && <tr><td colSpan={8} className="empty">Không tìm thấy xe phù hợp.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}

function MiniStat({ icon, accent, label, value }) {
  return (
    <div className="kpi" style={{ '--accent': accent }}>
      <div className="kpi-top"><div className="kpi-ic" style={{ background: accent }}>{icon}</div></div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}
