import { useEffect, useState } from 'react'
import { api } from '../api'
import { vnd, vndShort, num, periodLabel } from '../format'
import { BarChart, Donut } from '../charts'
import { Card, Loading } from '../ui'
import { ApiError } from './Overview'

const CH_COLORS = { App: '#0a64b4', POS: '#10b981', Online: '#6366f1' }
const PM_COLORS = { 'Chuyển khoản': '#0a64b4', 'Tiền mặt': '#10b981', POS: '#6366f1', BNPL: '#f59e0b' }
const SEG_COLORS = { 'Đổi pin': '#0a64b4', 'Kèm pin': '#10b981', 'Học sinh': '#f59e0b', Khác: '#94a3b8' }

const PERIODS = [
  { key: 'day', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm nay' },
  { key: 'all', label: 'Tất cả' },
]

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

export default function SalesReport() {
  const [globalPeriod, setGlobalPeriod] = useState('all')

  const [revPeriod, setRevPeriod] = useState('all')
  const [chanPeriod, setChanPeriod] = useState('all')
  const [payPeriod, setPayPeriod] = useState('all')
  const [segPeriod, setSegPeriod] = useState('all')
  const [modelPeriod, setModelPeriod] = useState('all')
  const [storePeriod, setStorePeriod] = useState('all')

  const [revData, setRevData] = useState(null)
  const [chanData, setChanData] = useState(null)
  const [payData, setPayData] = useState(null)
  const [segData, setSegData] = useState(null)
  const [modelData, setModelData] = useState(null)
  const [storeData, setStoreData] = useState(null)

  const [err, setErr] = useState(null)
  const [hoveredChart, setHoveredChart] = useState(null)

  const handleGlobalChange = (p) => {
    setGlobalPeriod(p)
    setRevPeriod(p)
    setChanPeriod(p)
    setPayPeriod(p)
    setSegPeriod(p)
    setModelPeriod(p)
    setStorePeriod(p)
  }

  useEffect(() => { api.revenue(12, revPeriod).then(setRevData).catch(e => setErr(e.message)) }, [revPeriod])
  useEffect(() => { api.salesByChannel(chanPeriod).then(setChanData).catch(e => setErr(e.message)) }, [chanPeriod])
  useEffect(() => { api.paymentMethods(payPeriod).then(setPayData).catch(e => setErr(e.message)) }, [payPeriod])
  useEffect(() => { api.salesBySegment(segPeriod).then(setSegData).catch(e => setErr(e.message)) }, [segPeriod])
  useEffect(() => { api.salesByModel(10, modelPeriod).then(setModelData).catch(e => setErr(e.message)) }, [modelPeriod])
  useEffect(() => { api.salesByStore(storePeriod).then(setStoreData).catch(e => setErr(e.message)) }, [storePeriod])

  if (err) return <ApiError msg={err} />
  if (!revData || !chanData || !payData || !segData || !modelData || !storeData) return <Loading />

  const totalRev = revData.reduce((a, r) => a + r.revenue, 0)
  const totalUnits = modelData.reduce((a, m) => a + m.units, 0)

  return (
    <div className="grid fade-in" style={{ gap: 20 }}>
      {/* Global Filter */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-2)' }}>Khoảng thời gian:</span>
        <PeriodChips value={globalPeriod} onChange={handleGlobalChange} />
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--vf-blue)' }}>{vnd(totalRev)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {PERIODS.find(p => p.key === globalPeriod)?.label} · {num(totalUnits)} xe
          </div>
        </div>
      </div>

      <Card title="Doanh thu thuần" sub={PERIODS.find(p => p.key === revPeriod)?.label}>
        <div style={{ marginBottom: 10 }}><PeriodChips value={revPeriod} onChange={setRevPeriod} small /></div>
        {/* Set maxAxis value in BarChart component */}
        <BarChart height={260} data={revData.map((r) => ({
          label: periodLabel(r.period), value: r.revenue
        }))} maxAxis={2000000000} isCurrency={true} /> 
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card title="Theo kênh bán" sub="App · POS · Online"
          style={{ border: hoveredChart === 'channel' ? '2px solid var(--vf-blue)' : undefined, transition: 'border 0.15s' }}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={chanPeriod} onChange={setChanPeriod} small /></div>
          <div onMouseEnter={() => setHoveredChart('channel')} onMouseLeave={() => setHoveredChart(null)} style={{ cursor: 'pointer' }}>
            <Donut size={150} data={chanData.map((c) => ({
              label: c.channel, value: c.revenue, color: CH_COLORS[c.channel] || '#94a3b8'
            }))} centerLabel={chanData.length} centerSub="kênh" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {chanData.map((c) => (
                <div key={c.channel} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 8px', borderRadius: 6, background: '#f8fafc' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: CH_COLORS[c.channel] || '#94a3b8', flexShrink: 0 }} />
                    {c.channel}
                  </span>
                  <span className="t-strong t-mono">{vndShort(c.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Phương thức thanh toán" sub="Tỉ trọng dòng tiền"
          style={{ border: hoveredChart === 'payment' ? '2px solid var(--vf-blue)' : undefined, transition: 'border 0.15s' }}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={payPeriod} onChange={setPayPeriod} small /></div>
          <div onMouseEnter={() => setHoveredChart('payment')} onMouseLeave={() => setHoveredChart(null)} style={{ cursor: 'pointer' }}>
            <Donut size={150} data={payData.map((p) => ({
              label: p.method, value: p.amount, color: PM_COLORS[p.method] || '#94a3b8'
            }))} centerLabel={num(payData.reduce((a, p) => a + p.count, 0))} centerSub="giao dịch" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {payData.map((p) => (
                <div key={p.method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 8px', borderRadius: 6, background: '#f8fafc' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: PM_COLORS[p.method] || '#94a3b8', flexShrink: 0 }} />
                    {p.method}
                  </span>
                  <span className="t-strong t-mono">{vndShort(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Theo phân khúc" sub="Đổi pin · Kèm pin · Học sinh"
          style={{ border: hoveredChart === 'segment' ? '2px solid var(--vf-blue)' : undefined, transition: 'border 0.15s' }}>
          <div style={{ marginBottom: 10 }}><PeriodChips value={segPeriod} onChange={setSegPeriod} small /></div>
          <div onMouseEnter={() => setHoveredChart('segment')} onMouseLeave={() => setHoveredChart(null)} style={{ cursor: 'pointer' }}>
            <Donut size={150} data={segData.map((s) => ({
              label: s.segment, value: s.revenue, color: SEG_COLORS[s.segment] || '#94a3b8'
            }))} centerLabel={num(totalUnits)} centerSub="xe" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {segData.map((s) => (
                <div key={s.segment} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 8px', borderRadius: 6, background: '#f8fafc' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEG_COLORS[s.segment] || '#94a3b8', flexShrink: 0 }} />
                    {s.segment}
                  </span>
                  <span className="t-strong t-mono">{vndShort(s.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <Card title="Bảng xếp hạng dòng xe" sub="Theo doanh thu">
          <div style={{ marginBottom: 10 }}><PeriodChips value={modelPeriod} onChange={setModelPeriod} small /></div>
          <div className="table-wrap">
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead><tr><th>#</th><th>Dòng xe</th><th className="t-right">Số xe</th><th className="t-right">Doanh thu</th><th>Tỉ trọng</th></tr></thead>
              <tbody>
                {modelData.map((m, i) => {
                  const maxRev = modelData[0]?.revenue || 1
                  return (
                    <tr key={m.model} style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                      <td><span className={`rk ${i === 0 ? 'top' : ''}`} style={{ display: 'inline-grid', transform: 'scale(0.85)' }}>{i + 1}</span></td>
                      <td className="t-strong">{m.model}</td>
                      <td className="t-right t-mono">{num(m.units)}</td>
                      <td className="t-right t-strong t-mono">{vnd(m.revenue)}</td>
                      <td style={{ minWidth: 100 }}><div className="bar-track" style={{ height: 6 }}><div className="bar-fill" style={{ width: `${(m.revenue / maxRev) * 100}%`, background: '#0a64b4', transition: 'width 0.3s ease' }} /></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Hiệu suất theo cơ sở" sub="Doanh thu & số xe">
          <div style={{ marginBottom: 10 }}><PeriodChips value={storePeriod} onChange={setStorePeriod} small /></div>
          {storeData.map((s, i) => {
            const maxRev = Math.max(...storeData.map((x) => x.revenue), 1)
            const colors = ['#0a64b4', '#10b981', '#6366f1', '#f59e0b', '#ec4899']
            return (
              <div key={s.store} style={{ marginBottom: 12, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <b style={{ fontSize: 13 }}>{s.store}</b>
                  <span className="t-muted" style={{ fontSize: 11 }}>{num(s.units)} xe</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 13 }}>{vndShort(s.revenue)}</span>
                </div>
                <div className="bar-track" style={{ height: 8 }}>
                  <div className="bar-fill" style={{ width: `${(s.revenue / maxRev) * 100}%`, background: colors[i % 5], transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
