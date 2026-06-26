// Định dạng số liệu kiểu Việt Nam.

export const vnd = (n) => (n || 0).toLocaleString('vi-VN') + '₫'

// Rút gọn: 63,1 tỷ · 12,4 tr · 980 ng
export const vndShort = (n) => {
  n = n || 0
  if (n >= 1e9) return (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ'
  if (n >= 1e6) return (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr'
  if (n >= 1e3) return (n / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ng'
  return String(n)
}

export const num = (n) => (n || 0).toLocaleString('vi-VN')

export const pct = (n) => (n > 0 ? '+' : '') + (n ?? 0) + '%'

// 'YYYY-MM' -> 'T6/26', 'YYYY-MM-DD' -> '15/06', 'YYYY-MM-DD HH:00' -> '15:00'
export const periodLabel = (p) => {
  if (!p) return ''
  if (p.includes(':')) {
    const parts = p.split(' ')
    if (parts.length === 2) return parts[1].slice(0, 5)
  }
  const parts = p.split('-')
  if (parts.length === 3) return `${Number(parts[2])}/${Number(parts[1])}`
  if (parts.length === 2) return 'T' + Number(parts[1]) + '/' + parts[0].slice(2)
  return p
}

// ISO -> 'dd/mm/yyyy'
export const dateVN = (s) => {
  if (!s) return '—'
  const d = s.slice(0, 10).split('-')
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : s
}

// ISO -> 'dd/mm/yyyy HH:MM'
export const dateTimeVN = (s) => {
  if (!s) return '—'
  const [date, time] = s.split('T')
  const d = date.split('-')
  return `${d[2]}/${d[1]}/${d[0]} ${time ? time.slice(0, 5) : ''}`.trim()
}

// "x phút/giờ/ngày trước" so với bản ghi mới nhất trong dữ liệu
export const ago = (s, refMs) => {
  if (!s) return ''
  const t = new Date(s.replace(' ', 'T')).getTime()
  const diff = Math.max(0, (refMs ?? Date.now()) - t)
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} ngày trước`
  return `${Math.round(days / 30)} tháng trước`
}

export const initials = (name) =>
  (name || '?').trim().split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()
