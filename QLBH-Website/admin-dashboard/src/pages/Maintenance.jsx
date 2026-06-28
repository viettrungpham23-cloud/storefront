import { useEffect, useState } from 'react'
import {
  Database, HardDrive, Layers3, CalendarX, Unlink, Unlock, Gauge,
  Eraser, RefreshCw, Trash2, CheckCircle2, AlertTriangle, ShieldAlert, Loader2,
} from 'lucide-react'
import { api } from '../api'
import { num } from '../format'
import { Card, Loading } from '../ui'
import { ApiError } from './Overview'

const TABLE_LABELS = {
  stores: 'Cửa hàng', customers: 'Khách hàng', product_variants: 'Biến thể SP',
  inventory_items: 'Kho (VIN)', inventory_logs: 'Nhật ký kho', promotions: 'Khuyến mại',
  accessories: 'Phụ kiện', value_added_services: 'Dịch vụ (VAS)', orders: 'Đơn hàng',
  order_details: 'Chi tiết đơn', payments: 'Thanh toán', debts: 'Công nợ',
  reconciliation_logs: 'Đối soát',
}

const ISSUE_LABELS = {
  future_orders: 'Đơn ngày tương lai', orphan_details: 'Chi tiết đơn mồ côi',
  orphan_payments: 'Thanh toán mồ côi', orphan_recon: 'Đối soát mồ côi',
  orphan_debts: 'Công nợ mồ côi', customers_no_orders: 'Khách không có đơn',
  reserved_inventory: 'Xe đang giữ (reserved)', unreconciled_payments: 'Thanh toán chưa đối soát',
}

const ACTIONS = [
  { key: 'remove_future', icon: CalendarX, tone: '#f59e0b', title: 'Xóa đơn ngày tương lai',
    desc: 'Gỡ đơn có ngày > hôm nay (nhiễu date_out) và trả xe về kho.' },
  { key: 'remove_orphans', icon: Unlink, tone: '#0a64b4', title: 'Gỡ bản ghi mồ côi',
    desc: 'Xóa chi tiết / thanh toán / đối soát không còn đơn cha.' },
  { key: 'release_reserved', icon: Unlock, tone: '#0a64b4', title: 'Giải phóng xe đang giữ',
    desc: 'Đưa xe trạng thái "reserved" về "available".' },
  { key: 'vacuum', icon: Gauge, tone: '#10b981', title: 'Tối ưu & nén (VACUUM)',
    desc: 'Dọn khoảng trống, thu nhỏ kích thước file CSDL.' },
  { key: 'wipe_transactions', icon: Eraser, tone: '#ef4444', title: 'Xóa dữ liệu giao dịch', destructive: true,
    desc: 'Xóa đơn / thanh toán / khách; GIỮ kho & dữ liệu tham chiếu.' },
  { key: 'reseed', icon: RefreshCw, tone: '#ef4444', title: 'Khôi phục dữ liệu gốc', destructive: true,
    desc: 'Dựng lại toàn bộ từ kho thật (2.998 xe). Mất dữ liệu hiện tại.' },
  { key: 'uat_stock', icon: Eraser, tone: '#f59e0b', title: 'Dọn kho UAT (20 xe/mẫu)', destructive: true,
    desc: 'Chỉ giữ lại đúng 20 xe mỗi mẫu (trạng thái available) cho UAT, xóa phần dư.' },
  { key: 'wipe_all', icon: Trash2, tone: '#ef4444', title: 'Làm trống toàn bộ', destructive: true,
    desc: 'Drop & tạo lại mọi bảng — CSDL rỗng hoàn toàn.' },
]

export default function Maintenance() {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const [confirmKey, setConfirmKey] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => { api.mntStats().then(setStats).catch((e) => setErr(e.message)) }, [])

  const run = async (action, confirm = false) => {
    setBusy(action); setConfirmKey(null); setResult(null)
    try {
      const r = await api.mntClean(action, confirm)
      const total = Object.values(r.counts).reduce((a, v) => a + (v || 0), 0)
      setStats((s) => ({ ...s, counts: r.counts, issues: r.issues, db_size_kb: r.db_size_kb, total_rows: total }))
      setResult({ ok: true, text: r.message })
    } catch (e) {
      setResult({ ok: false, text: e.response?.data?.detail || 'Lỗi kết nối máy chủ' })
    }
    setBusy(null)
  }

  if (err) return <ApiError msg={err} />
  if (!stats) return <Loading />

  const issueTotal = Object.values(stats.issues).reduce((a, v) => a + v, 0)

  return (
    <div className="grid fade-in" style={{ gap: 20 }}>
      {/* Tổng quan CSDL */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <Stat icon={<Database size={19} />} accent="#0a64b4" label="Tệp CSDL" value={stats.db_file} small />
        <Stat icon={<HardDrive size={19} />} accent="#6366f1" label="Dung lượng" value={`${num(Math.round(stats.db_size_kb))} KB`} />
        <Stat icon={<Layers3 size={19} />} accent="#10b981" label="Tổng số bản ghi" value={num(stats.total_rows)} />
        <Stat icon={<ShieldAlert size={19} />} accent={issueTotal ? '#f59e0b' : '#10b981'}
          label="Vấn đề dữ liệu" value={num(issueTotal)} />
      </div>

      {result && (
        <div className="banner" style={{ background: result.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: result.ok ? '#047857' : '#b91c1c' }}>
          {result.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<b>{result.text}</b>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 20, alignItems: 'start' }}>
        {/* Số lượng bản ghi + vấn đề */}
        <div className="grid" style={{ gap: 20 }}>
          <Card title="Số lượng bản ghi" sub="Theo từng bảng">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 18px' }}>
              {Object.entries(stats.counts).map(([t, c]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{TABLE_LABELS[t] || t}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 13 }} className="t-mono">{c == null ? '—' : num(c)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Chẩn đoán chất lượng dữ liệu" sub={issueTotal ? `${num(issueTotal)} mục cần xử lý` : 'Sạch — không có vấn đề'}>
            {Object.entries(stats.issues).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line-2)' }}>
                {v > 0 ? <AlertTriangle size={15} color="#f59e0b" /> : <CheckCircle2 size={15} color="#10b981" />}
                <span style={{ fontSize: 13 }}>{ISSUE_LABELS[k] || k}</span>
                <span className={`badge ${v > 0 ? 'amber' : 'green'}`} style={{ marginLeft: 'auto' }}>{num(v)}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Thao tác dọn dẹp */}
        <Card title="Thao tác dọn dẹp" sub="Hành động xóa cần xác nhận trước khi chạy">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            const isBusy = busy === a.key
            const isConfirm = confirmKey === a.key
            return (
              <div key={a.key} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0',
                borderBottom: '1px solid var(--line-2)',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center', background: a.tone + '18', color: a.tone }}>
                  <Icon size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                    {a.title}{a.destructive && <span className="badge red" style={{ fontSize: 10 }}>Khó hoàn tác</span>}
                  </div>
                  <div className="t-muted" style={{ fontSize: 12, marginTop: 2 }}>{a.desc}</div>
                </div>
                {isConfirm ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn ghost" style={{ padding: '7px 12px' }} onClick={() => setConfirmKey(null)}>Hủy</button>
                    <button className="btn" style={{ background: '#ef4444', padding: '7px 12px' }} onClick={() => run(a.key, true)}>Xác nhận</button>
                  </div>
                ) : (
                  <button className={`btn ${a.destructive ? '' : 'ghost'}`}
                    style={{ flexShrink: 0, ...(a.destructive ? { background: '#ef4444' } : {}) }}
                    disabled={!!busy}
                    onClick={() => (a.destructive ? setConfirmKey(a.key) : run(a.key))}>
                    {isBusy ? <Loader2 size={15} className="spin-ic" /> : <Icon size={15} />}
                    {isBusy ? 'Đang chạy…' : 'Chạy'}
                  </button>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', gap: 7, alignItems: 'center' }}>
            <ShieldAlert size={13} /> Có thể khôi phục lại dữ liệu gốc bất cứ lúc nào bằng "Khôi phục dữ liệu gốc".
          </div>
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon, accent, label, value, small }) {
  return (
    <div className="kpi" style={{ '--accent': accent }}>
      <div className="kpi-top"><div className="kpi-ic" style={{ background: accent }}>{icon}</div></div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={small ? { fontSize: 16, wordBreak: 'break-all' } : undefined}>{value}</div>
    </div>
  )
}
