import axios from 'axios'

// Một công tắc duy nhất cho địa chỉ backend (đặt VITE_API_BASE khi triển khai).
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const http = axios.create({ baseURL: API_BASE, timeout: 15000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('qlbh_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const get = (url, params) => http.get(url, { params }).then((r) => r.data)
const post = (url, data) => http.post(url, data).then((r) => r.data)
const patch = (url, data) => http.patch(url, data).then((r) => r.data)

export const api = {
  setToken: (token) => {
    if (token) {
      http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete http.defaults.headers.common['Authorization'];
    }
  },
  // Dashboard / phân tích
  summary: (period = 'all') => get('/api/v1/dashboard/summary', { period }),
  revenue: (months = 12, period = 'all') => get('/api/v1/dashboard/revenue', { months, period }),
  salesByModel: (limit = 8, period = 'all') => get('/api/v1/dashboard/sales-by-model', { limit, period }),
  salesByStore: (period = 'all') => get('/api/v1/dashboard/sales-by-store', { period }),
  salesBySegment: (period = 'all') => get('/api/v1/dashboard/sales-by-segment', { period }),
  salesByChannel: (period = 'all') => get('/api/v1/dashboard/sales-by-channel', { period }),
  paymentMethods: (period = 'all') => get('/api/v1/dashboard/payment-methods', { period }),
  inventorySummary: () => get('/api/v1/dashboard/inventory-summary'),
  reconciliation: () => get('/api/v1/dashboard/reconciliation'),
  topCustomers: (limit = 8, period = 'all') => get('/api/v1/dashboard/top-customers', { limit, period }),
  recentActivity: (limit = 12, period = 'all') => get('/api/v1/dashboard/recent-activity', { limit, period }),

  // Bảng dữ liệu
  orders: (p) => get('/api/v1/orders', p),
  orderDetail: (no) => get(`/api/v1/orders/${no}`),
  inventory: (p) => get('/api/v1/inventory', p),
  inventoryModels: () => get('/api/v1/inventory/models'),
  inventoryColors: () => get('/api/v1/inventory/colors'),
  customers: (p) => get('/api/v1/customers', p),
  pendingOrders: () => get('/api/v1/admin/pending-orders'),

  // Hồ sơ khách hàng chi tiết
  customerDetail: (cid) => get(`/api/v1/customers/${cid}`),
  customerUpdate: (cid, body) => http.put(`/api/v1/customers/${cid}`, body).then((r) => r.data),
  customerPurchases: (cid) => get(`/api/v1/customers/${cid}/purchases`),
  customerParts: (cid) => get(`/api/v1/customers/${cid}/parts`),
  customerServices: (cid) => get(`/api/v1/customers/${cid}/services`),
  customerImages: (cid) => get(`/api/v1/customers/${cid}/images`),
  customerUploadImage: (cid, body) => http.post(`/api/v1/customers/${cid}/images`, body).then((r) => r.data),
  provenance: (vin) => get(`/api/v1/inventory/provenance/${vin}`),

  // Hành động
  verify: (order_no, frame) => patch(`/api/v1/admin/orders/${order_no}/verify?physical_frame_number=${encodeURIComponent(frame)}`),
  assignVin: (order_no, vin_code) => patch(`/api/v1/admin/orders/${order_no}/assign_vin?vin_code=${encodeURIComponent(vin_code)}`),
  getAvailableVins: (model) => get('/api/v1/admin/available-vins', { model }),
  finalizeOrder: (order_no, payment_method) => post(`/api/v1/admin/orders/${order_no}/finalize`, { payment_method }),
  editOrder: (order_no, body) => patch(`/api/v1/admin/orders/${order_no}/edit`, body),

  // Quản trị / dọn dẹp CSDL
  mntStats: () => get('/api/v1/maintenance/stats'),
  mntClean: (action, confirm = false) =>
    http.post('/api/v1/maintenance/clean', { action, confirm }).then((r) => r.data),

  // Mua hàng / Nhập hàng (procurement)
  poSummary: () => get('/api/v1/procurement/summary'),
  poList: (p) => get('/api/v1/procurement/orders', p),
  poDetail: (poNo) => get(`/api/v1/procurement/orders/${poNo}`),
  poSuppliers: () => get('/api/v1/procurement/suppliers'),
  poCreate: (body) => http.post('/api/v1/procurement/orders', body).then((r) => r.data),
  poImportReceipt: (body) => http.post('/api/v1/procurement/receipts', body).then((r) => r.data),
}
