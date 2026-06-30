import { useEffect, useState } from 'react'
import {
  Wallet, ShoppingBag, Bike, Boxes, ArrowUpRight, Package,
  ShieldCheck, AlertTriangle, Store, Maximize2, X,
} from 'lucide-react'
import { api } from '../api'
import { vnd, vndShort, num, ago } from '../format'
import { AreaLineChart, BarChart, Donut } from '../charts'
import { Card, Kpi, Status, Loading, Avatar } from '../ui'

const SEG_COLORS = { 'Đổi pin': '#0a64b4', 'Kèm pin': '#10b981', 'Học sinh': '#f59e0b', Khác: '#94a3b8' }
const STORE_COLORS = ['#0a64b4', '#10b981', '#6366f1', '#f59e0b', '#ec4899']
const PERIODS = [
  { key: 'day', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm nay' },
  { key: 'all', label: 'Tất cả' },
]
const plabel = (k) => PERIODS.find(p => p.key === k)?.label || ''

function PeriodChips({ value, onChange, small }) {
  return (
    <div className="filters" style={{ display: 'flex', gap: 4 }}>
      {PERIODS.map((p) => (
        <button key={p.key} className={`chip ${value === p.key ? 'active' : ''}`}
          onClick={() => onChange(p.key)}
          style={{ fontSize: small ? 10.5 : 11.5, padding: small ? '2px 8px' : '4px 12px', transition: 'all 0.15s' }}
        >{p.label}</button>
      ))}
    </div>
  )
}

function ExpandBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Mở rộng"
      style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 7, cursor: 'pointer', padding: '4px 6px', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--vf-blue)'; e.currentTarget.style.color = 'var(--vf-blue)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-3)' }}>
      <Maximize2 size={14} />
    </button>
  )
}

function WidgetModal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card fade-in" style={{ width: '95%', maxWidth: 1000, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export default function Overview() {
  // Global filter — khi thay đổi sẽ đồng bộ tất cả chart
  const [globalPeriod, setGlobalPeriod] = useState('month')

  // Per-chart periods (có thể tự điều chỉnh riêng)
  const [revPeriod, setRevPeriod] = useState('month')
  const [modelPeriod, setModelPeriod] = useState('month')
  const [segPeriod, setSegPeriod] = useState('month')
  const [storePeriod, setStorePeriod] = useState('month')
  const [topPeriod, setTopPeriod] = useState('month')

  // Khi global thay đổi → đồng bộ tất cả
  const handleGlobalChange = (p) => {
    setGlobalPeriod(p)
    setRevPeriod(p)
    setModelPeriod(p)
    setSegPeriod(p)
    setStorePeriod(p)
    setTopPeriod(p)
  }

  // Data states
  const [kpi, setKpi] = useState(null)
  const [revData, setRevData] = useState(null)
  const [modelData, setModelData] = useState(null)
  const [segData, setSegData] = useState(null)
  const [storeData, setStoreData] = useState(null)
  const [actData, setActData] = useState(null)
  const [reconData, setReconData] = useState(null)
  const [topData, setTopData] = useState(null)
  const [widget, setWidget] = useState(null)
  const [err, setErr] = useState(null)
  const [nowMs] = useState(() => Date.now())

  // Fetch independently
  useEffect(() => { api.summary(globalPeriod).then(setKpi).catch(e => setErr(e.message)) }, [globalPeriod])
  useEffect(() => { api.revenue(12, revPeriod).then(setRevData).catch(() => {}) }, [revPeriod])
  useEffect(() => { api.salesByModel(7, modelPeriod).then(setModelData).catch(() => {}) }, [modelPeriod])
  useEffect(() => { api.salesBySegment(segPeriod).then(setSegData).catch(() => {}) }, [segPeriod])
  useEffect(() => { api.salesByStore(storePeriod).then(setStoreData).catch(() => {}) }, [storePeriod])
  useEffect(() => { api.recentActivity(8, 'all').then(setActData).catch(() => {}) }, [])
  useEffect(() => { api.reconciliation().then(setReconData).catch(() => {}) }, [])
  useEffect(() => { api.topCustomers(5, topPeriod).then(setTopData).catch(() => {}) }, [topPeriod])

  if (!kpi) return <Loading />
  if (err) return <ApiError msg={err} />

  const s = kpi
  const refMs = actData?.[0] ? new Date(actData[0].created_at.replace(' ', 'T')).getTime() : nowMs
  const reconMatched = reconData?.find((r) => r.status === 'matched')?.amount || 0
  const reconTotal = reconData?.reduce((a, r) => a + r.amount, 0) || 1
  const revTotal = revData ? revData.reduce((a, r) => a + r.revenue, 0) : 0
  const modelTotal = modelData ? modelData.reduce((a, m) => a + m.units, 0) : 0
  const storeTotal = storeData ? storeData.reduce((a, x) => a + x.revenue, 0) : 0

  return (
    <div className="grid fade-in" style={{ gap: 20, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Global Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink-2)' }}>Tổng quan:</span>
        <PeriodChips value={globalPeriod} onChange={handleGlobalChange} />
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--vf-blue)' }}>{vnd(s.revenue_month)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{plabel(globalPeriod)}</div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpis">
        <Kpi icon={<Wallet size={21} />} accent="#0a64b4" label={`Doanh thu ${plabel(globalPeriod).toLowerCase()}`}
          value={vndShort(s.revenue_month)} trend={s.growth_pct}
          meta={<>kỳ trước ({vndShort(s.revenue_prev_month)})</>} />
        <Kpi icon={<ArrowUpRight size={21} />} accent="#10b981" label="Tổng doanh thu lũy kế"
          value={vndShort(s.revenue_total)} meta={<>{num(s.orders_total)} đơn đã chốt</>} />
        <Kpi icon={<Bike size={21} />} accent="#6366f1" label="Xe đã bán"
          value={num(s.units_sold)} meta={<>TB {vndShort(s.avg_order_value)}/đơn</>} />
        <Kpi icon={<Boxes size={21} />} accent="#f59e0b" label="Tồn kho sẵn sàng"
          value={num(s.inventory_available)} meta={<>{s.inventory_reserved} đang giữ · {num(s.inventory_sold)} đã bán</>} />
      </div>

      {/* Revenue + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: 20, flex: 1 }}>
        <Card title="Doanh thu thuần" sub={plabel(revPeriod)}
          right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--vf-blue)' }}>{vnd(revTotal)}</div>
            </div>
            <ExpandBtn onClick={() => setWidget('revenue')} />
          </div>}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={revPeriod} onChange={setRevPeriod} small /></div>
          {revData ? <AreaLineChart data={revData} /> : <Loading />}
        </Card>

        <Card title="Hoạt động gần đây" sub="Đơn hàng mới nhất" bodyStyle={{ padding: 0 }}>
          <div className="feed" style={{ maxHeight: 340, overflowY: 'auto', padding: '14px 20px' }}>
            {actData ? actData.map((a) => (
              <div className="it" key={a.order_no}>
                <div className="ic" style={{ background: '#e6f0fa', color: 'var(--vf-blue)' }}><ShoppingBag size={16} /></div>
                <div className="tx" style={{ flex: 1 }}>
                  <div><b>{a.customer}</b> mua <b>{a.model}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span className="t-mono" style={{ fontWeight: 700, color: 'var(--vf-blue)' }}>{vnd(a.total)}</span>
                    <Status value={a.status} />
                  </div>
                  <div className="tm">{a.order_no} · {a.store} · {ago(a.created_at, refMs)}</div>
                </div>
              </div>
            )) : <Loading />}
          </div>
        </Card>
      </div>

      {/* Models + Segment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: 20, flex: 1 }}>
        <Card title="Doanh số theo dòng xe" sub={`${num(modelTotal)} xe — ${plabel(modelPeriod)}`}
          right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--vf-blue)' }}>{modelData ? vndShort(modelData.reduce((a,m)=>a+m.revenue,0)) : '…'}</span>
            <ExpandBtn onClick={() => setWidget('models')} />
          </div>}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={modelPeriod} onChange={setModelPeriod} small /></div>
          {modelData ? <BarChart data={modelData.map((m) => ({ label: m.model, value: m.units, revenue: m.revenue }))} /> : <Loading />}
        </Card>

        <Card title="Tỉ trọng theo phân khúc" sub={plabel(segPeriod)}
          right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--vf-blue)' }}>{segData ? vndShort(segData.reduce((a,x)=>a+x.revenue,0)) : '…'}</span>
            <ExpandBtn onClick={() => setWidget('segment')} />
          </div>}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={segPeriod} onChange={setSegPeriod} small /></div>
          {segData ? <Donut
            data={segData.map((x) => ({ label: x.segment, value: x.revenue, color: SEG_COLORS[x.segment] || '#94a3b8' }))}
            centerLabel={num(segData.reduce((a,x)=>a+x.units,0))} centerSub="xe" /> : <Loading />}
        </Card>
      </div>

      {/* Stores + Recon + VIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, flex: 1 }}>
        <Card title="Doanh thu theo cơ sở" sub={plabel(storePeriod)}
          right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--vf-blue)' }}>{vndShort(storeTotal)}</span>
            <ExpandBtn onClick={() => setWidget('stores')} />
          </div>}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={storePeriod} onChange={setStorePeriod} small /></div>
          {storeData ? storeData.map((st, i) => {
            const maxRev = Math.max(...storeData.map((x) => x.revenue), 1)
            return (
              <div key={st.store} style={{ marginBottom: 14, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, transition: 'background 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: STORE_COLORS[i % 5], display: 'grid', placeItems: 'center' }}><Store size={15} /></span>
                  <b style={{ fontSize: 13 }}>{st.store}</b>
                  <span className="t-muted" style={{ fontSize: 11.5 }}>{st.units} xe</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 13 }}>{vndShort(st.revenue)}</span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(st.revenue / maxRev) * 100}%`, background: STORE_COLORS[i % 5], transition: 'width 0.3s ease' }} /></div>
              </div>
            )
          }) : <Loading />}
        </Card>

        <Card title="Đối soát dòng tiền" sub="Trạng thái xác minh thu">
          {reconData ? <>
            <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0 10px' }}>
              <Donut size={150} thickness={22}
                data={reconData.map((r) => ({
                  label: r.label, value: r.amount,
                  color: r.status === 'matched' ? '#10b981' : r.status === 'unreconciled' ? '#f59e0b' : '#ef4444',
                }))}
                centerLabel={Math.round((reconMatched / reconTotal) * 100) + '%'} centerSub="đã khớp" />
            </div>
            <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10, fontSize: 12.5 }}>
              {reconData.map((r) => (
                <div key={r.status} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  {r.status === 'matched' ? <ShieldCheck size={14} color="#10b981" /> : <AlertTriangle size={14} color={r.status === 'discrepancy' ? '#ef4444' : '#f59e0b'} />}
                  <span>{r.label}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{num(r.count)}</span>
                </div>
              ))}
            </div>
          </> : <Loading />}
        </Card>

        <Card title="Khách hàng VIP" sub={`Chi tiêu cao nhất — ${plabel(topPeriod)}`}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={topPeriod} onChange={setTopPeriod} small /></div>
          {topData ? topData.map((c, i) => (
            <div className="rank-row" key={c.customer_id}
              style={{ cursor: 'pointer', padding: '6px 4px', borderRadius: 6, transition: 'background 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}>
              <Avatar name={c.name} color={STORE_COLORS[i % 5]} />
              <div className="nm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}<div className="tm t-muted" style={{ fontSize: 11 }}>{c.orders} đơn · {c.group}</div>
              </div>
              <span className="vl">{vndShort(c.spend)}</span>
            </div>
          )) : <Loading />}
        </Card>
      </div>

      {/* Widget Modals */}
      {widget === 'revenue' && (
        <WidgetModal title={`Doanh thu thuần — ${plabel(revPeriod)}`} onClose={() => setWidget(null)}>
          <div style={{ marginBottom: 16, textAlign: 'right', fontSize: 22, fontWeight: 800, color: 'var(--vf-blue)' }}>{vnd(revTotal)}</div>
          {revData && <AreaLineChart data={revData} height={400} />}
          {revData && <div className="table-wrap" style={{ marginTop: 20 }}>
            <table className="tbl"><thead><tr><th>Kỳ</th><th className="t-right">Số đơn</th><th className="t-right">Doanh thu</th></tr></thead>
              <tbody>{revData.map((r, i) => (
                <tr key={i}><td className="t-mono">{r.period}</td><td className="t-right t-mono">{num(r.orders)}</td><td className="t-right t-strong t-mono">{vnd(r.revenue)}</td></tr>
              ))}</tbody></table></div>}
        </WidgetModal>
      )}
      {widget === 'models' && (
        <WidgetModal title={`Doanh số theo dòng xe — ${plabel(modelPeriod)}`} onClose={() => setWidget(null)}>
          {modelData && <>
            <BarChart data={modelData.map((m) => ({ label: m.model, value: m.units, revenue: m.revenue }))} height={350} />
            <div className="table-wrap" style={{ marginTop: 20 }}>
              <table className="tbl"><thead><tr><th>#</th><th>Dòng xe</th><th className="t-right">Số xe</th><th className="t-right">Doanh thu</th><th>Tỉ trọng</th></tr></thead>
                <tbody>{modelData.map((m, i) => {
                  const mx = modelData[0]?.revenue||1
                  return <tr key={m.model}><td>{i+1}</td><td className="t-strong">{m.model}</td><td className="t-right t-mono">{num(m.units)}</td><td className="t-right t-strong t-mono">{vnd(m.revenue)}</td>
                    <td style={{minWidth:120}}><div className="bar-track"><div className="bar-fill" style={{width:`${(m.revenue/mx)*100}%`,background:'#0a64b4',transition:'width .3s'}}/></div></td></tr>
                })}</tbody></table></div>
          </>}
        </WidgetModal>
      )}
      {widget === 'segment' && segData && (
        <WidgetModal title={`Phân khúc — ${plabel(segPeriod)}`} onClose={() => setWidget(null)}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Donut size={260} thickness={36} data={segData.map((x) => ({ label: x.segment, value: x.revenue, color: SEG_COLORS[x.segment] || '#94a3b8' }))}
              centerLabel={num(segData.reduce((a,x)=>a+x.units,0))} centerSub="xe" />
          </div>
          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table className="tbl"><thead><tr><th>Phân khúc</th><th className="t-right">Số xe</th><th className="t-right">Doanh thu</th><th className="t-right">Tỉ lệ</th></tr></thead>
              <tbody>{segData.map((x) => {
                const t=segData.reduce((a,s)=>a+s.revenue,0)||1
                return <tr key={x.segment}><td className="t-strong">{x.segment}</td><td className="t-right t-mono">{num(x.units)}</td><td className="t-right t-strong t-mono">{vnd(x.revenue)}</td><td className="t-right">{Math.round(x.revenue/t*100)}%</td></tr>
              })}</tbody></table></div>
        </WidgetModal>
      )}
      {widget === 'stores' && storeData && (
        <WidgetModal title={`Cơ sở — ${plabel(storePeriod)}`} onClose={() => setWidget(null)}>
          <div className="table-wrap">
            <table className="tbl"><thead><tr><th>Cơ sở</th><th className="t-right">Số xe</th><th className="t-right">Doanh thu</th><th>Tỉ trọng</th></tr></thead>
              <tbody>{storeData.map((st,i)=>{
                const mx=Math.max(...storeData.map(x=>x.revenue),1)
                return <tr key={st.store}><td className="t-strong">{st.store}</td><td className="t-right t-mono">{num(st.units)}</td><td className="t-right t-strong t-mono">{vnd(st.revenue)}</td>
                  <td style={{minWidth:120}}><div className="bar-track"><div className="bar-fill" style={{width:`${(st.revenue/mx)*100}%`,background:STORE_COLORS[i%5],transition:'width .3s'}}/></div></td></tr>
              })}</tbody></table></div>
        </WidgetModal>
      )}
    </div>
  )
}

export function ApiError({ msg }) {
  const text = String(msg || '')
  const isAuth = /token|quyền|quản trị|xác thực|permission|unauthorized|forbidden|403|401/i.test(text)
  return (
    <div className="empty">
      <Package size={36} color="#cbd5e1" /><br />
      {isAuth ? 'Không đủ quyền truy cập API.' : 'Không kết nối được máy chủ API.'}<br />
      <span style={{ fontSize: 12 }}>
        {isAuth ? 'Hãy đăng nhập lại bằng tài khoản admin được cấp quyền.' : <>Hãy chạy backend: <code>uvicorn main:app --reload</code> (cổng 8000).</>}
      </span>
      <div style={{ marginTop: 8, fontSize: 11.5, color: '#cbd5e1' }}>{text}</div>
    </div>
  )
}
