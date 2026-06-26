import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, BarChart3, ShoppingCart, Package, Users,
  ScanLine, Bell, Search, ChevronDown, Database, PackagePlus, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import Overview from './pages/Overview'
import SalesReport from './pages/SalesReport'
import Orders from './pages/Orders'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Reconciliation from './pages/Reconciliation'
import Maintenance from './pages/Maintenance'
import Procurement from './pages/Procurement'
import UsersPage from './pages/Users'
import { api } from './api'

const NAV = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard, group: 'Điều hành' },
  { key: 'report', label: 'Báo cáo bán hàng', icon: BarChart3, group: 'Điều hành' },
  { key: 'procurement', label: 'Mua hàng / Nhập kho', icon: PackagePlus, group: 'Vận hành' },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingCart, group: 'Vận hành' },
  { key: 'reconcile', label: 'Đối soát & Duyệt', icon: ScanLine, group: 'Vận hành', badge: true },
  { key: 'inventory', label: 'Quản lý kho', icon: Package, group: 'Vận hành' },
  { key: 'customers', label: 'Khách hàng', icon: Users, group: 'Dữ liệu' },
  { key: 'users', label: 'Nhân sự', icon: Users, group: 'Hệ thống' },
  { key: 'maintenance', label: 'Quản trị CSDL', icon: Database, group: 'Hệ thống' },
]

const TITLES = {
  overview: ['Tổng quan hoạt động', 'Bức tranh toàn cảnh hệ sinh thái bán hàng'],
  report: ['Báo cáo bán hàng', 'Phân tích doanh thu, kênh bán và sản phẩm'],
  procurement: ['Mua hàng / Nhập kho', 'Đơn đặt từ nhà máy & đại lý, theo dõi lô về và aging'],
  orders: ['Đơn hàng', 'Toàn bộ đơn từ App, POS và Online'],
  reconcile: ['Đối soát & Duyệt xuất kho', 'Kiểm tra số khung và xác minh dòng tiền'],
  inventory: ['Quản lý kho', 'Sổ kho theo số khung (VIN) đa cơ sở'],
  customers: ['Khách hàng', 'Hồ sơ và lịch sử mua của khách'],
  users: ['Quản lý nhân sự', 'Thêm email, phân quyền và khóa tài khoản'],
  maintenance: ['Quản trị CSDL', 'Dọn dẹp & bảo trì cơ sở dữ liệu localhost'],
}

const PAGES = {
  overview: Overview, report: SalesReport, procurement: Procurement, orders: Orders,
  inventory: Inventory, customers: Customers, reconcile: Reconciliation,
  users: UsersPage, maintenance: Maintenance,
}

function Dropdown({ trigger, children, right = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ref])

  return (
    <div className="dropdown" style={{ position: 'relative' }} ref={ref}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {open && (
        <div className="dropdown-menu fade-in" style={{
          position: 'absolute', top: '100%', [right ? 'right' : 'left']: 0,
          background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
          boxShadow: 'var(--shadow-lg)', padding: 8, zIndex: 100, minWidth: 240,
          marginTop: 8
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function App({ user, onLogout }) {
  const [tab, setTab] = useState('overview')
  const Page = PAGES[tab]
  const [title, sub] = TITLES[tab]
  const groups = [...new Set(NAV.map((n) => n.group))]

  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    const fetchCount = () => {
      api.summary().then(d => setPendingCount(d.orders_pending)).catch(() => {})
    }
    fetchCount()
    // Refresh count automatically or whenever tab changes to 'overview' / 'reconcile'
    const timer = setInterval(fetchCount, 10000)
    return () => clearInterval(timer)
  }, [tab])

  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12 }}>
          {!collapsed && (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
              <img src="/logo.png" alt="TA innovation" style={{ height: 28, objectFit: 'contain' }} />
            </div>
          )}
          <button className="icon-btn toggle-btn" onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', background: 'rgba(255,255,255,.08)', border: 'none', color: '#94adc5', borderRadius: 8, padding: 6, display: 'grid', placeItems: 'center', flexShrink: 0, marginLeft: collapsed ? 'auto' : 'auto', marginRight: collapsed ? 'auto' : 0 }}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {groups.map((g) => (
          <div key={g}>
            <div className="nav-label">{g}</div>
            {NAV.filter((n) => n.group === g).map((n) => {
              if (n.key === 'users' && user.role !== 'admin') return null;
              if (n.key === 'maintenance' && user.role !== 'admin') return null;
              const Icon = n.icon
              return (
                <div key={n.key} data-key={n.key} className={`nav-item ${tab === n.key ? 'active' : ''}`} onClick={() => setTab(n.key)}>
                  <Icon size={18} /><span>{n.label}</span>
                  {n.badge && pendingCount > 0 && <span className="badge-dot">{pendingCount}</span>}
                </div>
              )
            })}
          </div>
        ))}

        <div className="sidebar-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div>API · cổng 8000<br />Đồng bộ App ↔ Website</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{title}</div>
            <div className="page-sub">{sub}</div>
          </div>
          <div className="spacer" />
          <div className="search">
            <Search size={15} />
            <input placeholder="Tìm nhanh đơn, xe, khách…" />
          </div>
          
          <Dropdown right trigger={
            <button className="icon-btn" style={{ cursor: 'pointer' }}><Bell size={18} /><span className="dot" /></button>
          }>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Thông báo (5)</span>
              <span style={{ fontSize: 11, color: 'var(--vf-blue)', cursor: 'pointer', fontWeight: 600 }}>Đánh dấu đã đọc</span>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0', width: 320 }}>
              
              <div className="nav-item" style={{ borderRadius: 0, padding: '12px 14px', borderBottom: '1px solid var(--line-2)', alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--vf-blue)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    <b>Đơn hàng DH02572</b> vừa được <b>Quản trị viên</b> xác minh số khung thành công (Đã đối soát).
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Vài giây trước</div>
                </div>
              </div>

              <div className="nav-item" style={{ borderRadius: 0, padding: '12px 14px', borderBottom: '1px solid var(--line-2)', alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--vf-blue)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    <b>Cảnh báo tồn kho:</b> Dòng xe <b>Feliz S</b> tại cơ sở <b>TA2</b> chỉ còn 1 chiếc (Dưới mức an toàn).
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>5 phút trước</div>
                </div>
              </div>

              <div className="nav-item" style={{ borderRadius: 0, padding: '12px 14px', borderBottom: '1px solid var(--line-2)', alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--vf-blue)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    Tài khoản khách hàng <b>Nguyễn Văn A</b> vừa được nâng hạng lên <b>Khách hàng VIP</b> do tổng chi tiêu đạt mốc.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>1 giờ trước</div>
                </div>
              </div>

              <div className="nav-item" style={{ borderRadius: 0, padding: '12px 14px', borderBottom: '1px solid var(--line-2)', alignItems: 'flex-start', opacity: 0.6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'transparent', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    Có 1 lô hàng nhập kho mới từ <b>VinFast Hải Phòng</b> với 15 xe VF Drimp vừa về tới kho tổng.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Hôm qua lúc 14:30</div>
                </div>
              </div>

              <div className="nav-item" style={{ borderRadius: 0, padding: '12px 14px', borderBottom: 'none', alignItems: 'flex-start', opacity: 0.6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'transparent', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    <b>TA3</b> đã hoàn tất đối soát dòng tiền cuối ngày: <b>Khớp 100%</b>.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Hôm qua lúc 20:00</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--line)', color: 'var(--vf-blue)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
              Xem toàn bộ thông báo
            </div>
          </Dropdown>

          <Dropdown right trigger={
            <div className="avatar" style={{ cursor: 'pointer' }}>
              {user?.picture ? (
                <img src={user.picture} style={{ width: 32, height: 32, borderRadius: '50%' }} alt="Avatar" />
              ) : (
                <div className="pic">{user?.name ? user.name.substring(0, 2).toUpperCase() : 'QT'}</div>
              )}
              <div className="who" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <b>{user?.name || 'Quản trị viên'}</b><span>Cơ sở TA1</span>
              </div>
              <ChevronDown size={16} color="#94a3b8" />
            </div>
          }>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
               {user?.picture ? (
                 <img src={user.picture} style={{ width: 32, height: 32, borderRadius: '50%' }} alt="Avatar" />
               ) : (
                 <div className="pic" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--vf-blue)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                   {user?.name ? user.name.substring(0, 2).toUpperCase() : 'QT'}
                 </div>
               )}
               <div>
                 <div style={{ fontWeight: 700 }}>{user?.name || 'Quản trị viên'}</div>
                 <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{user?.email || 'admin@thuanh.vn'}</div>
               </div>
            </div>
            <div style={{ padding: 4 }}>
              <button className="nav-item" style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--ink)' }}>Hồ sơ cá nhân</button>
              <button className="nav-item" style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--ink)' }}>Cài đặt hệ thống</button>
              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
              <button className="nav-item" onClick={onLogout} style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--red)' }}>Đăng xuất</button>
            </div>
          </Dropdown>
        </header>

        <main className="content">
          {/* Cấu trúc này sẽ tự động tải file Overview.jsx vào đây khi bạn bấm menu Tổng quan */}
          <Page key={tab} setTab={setTab} /> 
        </main>
      </div>
    </div>
  )
}