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
    apiBase: "",
    adminApiBase: "https://ta-admin-api.onrender.com"
  };
