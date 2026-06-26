import { vndShort, periodLabel, num } from './format'

/* Biểu đồ vùng + đường: xu hướng doanh thu theo tháng */
export function AreaLineChart({ data, height = 240 }) {
  const W = 760, H = height, pad = { l: 52, r: 16, t: 18, b: 28 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const niceMax = niceCeil(max)
  const x = (i) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v) => pad.t + ih - (v / niceMax) * ih
  const pts = data.map((d, i) => [x(i), y(d.revenue)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${pad.t + ih} L ${pad.l} ${pad.t + ih} Z`
  const ticks = 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a64b4" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0a64b4" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (niceMax / ticks) * i
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="#eef2f7" strokeWidth="1" />
            <text x={pad.l - 8} y={yy + 4} textAnchor="end" fontSize="10.5" fill="#94a3b8">{vndShort(v)}</text>
          </g>
        )
      })}
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#0a64b4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke="#0a64b4" strokeWidth="2" />
          <text x={p[0]} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#94a3b8">{periodLabel(data[i].period)}</text>
        </g>
      ))}
    </svg>
  )
}

/* Cột dọc: doanh số theo dòng xe */
export function BarChart({ data, height = 240, color = '#0a64b4', maxAxis, isCurrency }) {
  const W = 760, H = height, pad = { l: 52, r: 16, t: 18, b: 42 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const dataMax = Math.max(1, ...data.map((d) => d.value))
  const max = maxAxis ? Math.max(maxAxis, niceCeil(dataMax)) : niceCeil(dataMax)
  const n = data.length
  const bw = Math.min(46, (iw / n) * 0.55)
  const step = iw / n
  const ticks = 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i
        const yy = pad.t + ih - (v / max) * ih
        return (
          <g key={i}>
            <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="#eef2f7" />
            <text x={pad.l - 8} y={yy + 4} textAnchor="end" fontSize="10.5" fill="#94a3b8">
              {isCurrency ? vndShort(v) : (v % 1 ? '' : v)}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * ih
        const cx = pad.l + step * i + step / 2
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={pad.t + ih - h} width={bw} height={h} rx="5" fill="url(#barGrad)" />
            <text x={cx} y={pad.t + ih - h - 6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#475569">
              {isCurrency ? vndShort(d.value) : d.value}
            </text>
            <text x={cx} y={H - 22} textAnchor="middle" fontSize="10" fill="#64748b">{truncate(d.label, 9)}</text>
            <text x={cx} y={H - 9} textAnchor="middle" fontSize="9.5" fill="#a8b3c2">
              {isCurrency ? (d.orders ? num(d.orders) + ' đơn' : '') : vndShort(d.revenue)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* Vành khuyên: tỉ trọng theo phân khúc / phương thức thanh toán */
export function Donut({ data, size = 180, thickness = 26, centerLabel, centerSub }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const C = 2 * Math.PI * r
  const arcs = data.reduce(({ offset, items }, d, i) => {
    const frac = d.value / total
    const dash = frac * C
    return {
      offset: offset + dash,
      items: [...items, { d, i, dash, offset }],
    }
  }, { offset: 0, items: [] }).items
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
        {arcs.map(({ d, i, dash, offset }) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />
        ))}
        {centerLabel && (
          <g style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">{centerLabel}</text>
            <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10.5" fill="#94a3b8">{centerSub}</text>
          </g>
        )}
      </svg>
      <div className="legend" style={{ flexDirection: 'column', gap: 9, marginTop: 0 }}>
        {data.map((d, i) => (
          <div className="li" key={i} style={{ gap: 9 }}>
            <span className="sw" style={{ background: d.color }} />
            <span style={{ minWidth: 110 }}>{d.label}</span>
            <b style={{ color: '#0f172a' }}>{Math.round((d.value / total) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function niceCeil(v) {
  if (v <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / mag
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * mag
}
function truncate(s, n) { return s && s.length > n ? s.slice(0, n - 1) + '…' : s }
