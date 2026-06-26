/* Cấu hình runtime cho cửa hàng TA innovation.
 *
 * apiBase:
 *   ""  → gọi API cùng origin (khi Python server vừa phục vụ web vừa phục vụ API).
 *         Dùng cho bản chạy localhost và bản web host chung 1 nơi.
 *   "https://api.example.com" → trỏ tới backend đã deploy (KHÔNG có "/" cuối).
 *         Dùng cho app đóng gói (APK/IPA) và PWA host tách backend.
 *
 * Khi build app di động: chỉ cần sửa apiBase ở đây thành URL backend public.
 */
window.TA_CONFIG = {
  // Local: để trống → App gọi chính server.py (đã đồng bộ DB với Website QLBH).
  // Khi đóng gói mobile: đặt URL backend public (xem PACKAGING.md / sync.sh).
  apiBase: ""
};
