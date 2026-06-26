# **GIAO DIỆN ỨNG DỤNG PWA \- VAI TRÒ SALES**

**Mục tiêu thiết kế:** Tối giản hóa hành trình (User Journey). Mọi thao tác cốt lõi đều được thiết kế dựa trên tiêu chí "Một chạm" (One-tap action) để Sales tập trung vào việc tư vấn và chốt sale, thay vì phải cắm cúi nhập liệu. Màn hình tối ưu cho thao tác cầm điện thoại một tay.

## **1\. Màn Hình Chính (Dashboard Sales)**

Đây là màn hình đầu tiên Sales nhìn thấy khi mở ứng dụng. Không có bảng biểu phức tạp, chỉ tập trung vào 3 hành động chính (Call-to-Action).

**Header:**

* \[Logo Hệ Thống\]  
* Tên Sales: Nguyễn Văn A (Cơ sở TA1)  
* Nút \[Đăng xuất\] (Icon nhỏ góc phải)

**Khu vực CTA Chính (Big Buttons \- Các nút bấm lớn, dễ chạm):**

1. 🟢 **\[TẠO ĐƠN HÀNG NHANH\]** (Nút nổi bật nhất, màu primary, chiếm diện tích lớn nhất)  
2. 🔍 **\[KIỂM TRA ĐƠN HÀNG\]** (Nút thứ hai, hỗ trợ tra cứu nhanh khi khách hỏi)  
3. 📦 **\[TRA CỨU TỒN KHO\]** (Nút thứ ba, check xe cho khách)

## **2\. Luồng CTA 1: Tạo Đơn Hàng Nhanh (Smart Order Flow)**

Thay vì một biểu mẫu (form) dài, quy trình này sử dụng AI để "đọc" dữ liệu.

### **Bước 2.1: Thu Thập Dữ Liệu Tự Động**

Màn hình hiển thị 2 khối hành động lớn:

* **Khối 1: Chọn Sản phẩm**  
  * Nút: 📷 **\[Quét QR / Barcode Sản Phẩm\]** (Bấm vào mở ngay camera).  
  * *(Hoặc ô nhập mã tay bên dưới nút quét)*  
  * *Kết quả trả về:* Thẻ thông tin xe (VD: "EVO GRAND \- Trắng \- Sẵn hàng").  
* **Khối 2: Định danh Khách hàng**  
  * Nút: 🪪 **\[Quét / Tải Ảnh Thẻ VNeID/CCCD\]**  
  * *Kết quả trả về:* Hệ thống OCR bóc tách dữ liệu nền.

### **Bước 2.2: Form Xác Nhận & Chuyển Tiếp (Review Form)**

Hệ thống tự động dựng Form đã được điền sẵn 90%:

* *Họ và tên:* Đặng Văn B *(Tự động điền từ CCCD)*  
* *Số CCCD:* 00120202... *(Tự động điền từ CCCD)*  
* *Địa chỉ:* Phường X, Quận Y... *(Tự động điền từ CCCD)*  
* **Số điện thoại:** \[ Ô Nhập Tay duy nhất bắt buộc \]  
* **Thanh toán:** Dropdown chọn \[ Đặt cọc / Đã thanh toán / Chưa thanh toán \]  
* **Dịch vụ đi kèm/Ghi chú:** \[ Ô Nhập Tay \- VD: Lắp thêm cốp \]

**Hành động (Sticky Bottom Bar \- Nút bám đáy màn hình):**

* 🚀 **\[ LƯU & CHUYỂN TIẾP CHO ADMIN \]**

## **3\. Luồng CTA 2: Kiểm Tra Đơn Hàng Nhanh (Order Tracking)**

Thiết kế tối ưu để Sales trả lời khách hàng ngay lập tức khi khách gọi điện.

* **Thanh Tìm Kiếm Toàn Cầu:** Nhập "Số điện thoại", "Mã đơn hàng", hoặc "Số CCCD". Search real-time (gõ đến đâu hiện kết quả đến đó).  
* **Kết Quả Trực Quan (Dạng Thẻ/Card):**  
  * **Khách hàng:** Đặng Văn B (098x...) \- Mã đơn: DH1024  
  * **Sản phẩm:** EVO GRAND (Trắng)  
  * **Trạng thái thanh toán:** \[Tag Vàng: Đã Cọc\] hoặc \[Tag Xanh: Đã Thanh Toán\]  
  * **Tiến độ thực tế (Timeline/Progress Bar dọc):**  
    * ✅ Đã tạo đơn  
    * ✅ Admin đã duyệt & Ghép VIN (...1234)  
    * ⏳ Đang làm dịch vụ gia tăng / Lắp phụ kiện (Đang chờ)  
    * ⏳ Chờ xuất HĐ / Giao xe

## **4\. Luồng CTA 3: Kiểm Tra Kho Nhanh (Live Inventory)**

Giúp Sales trả lời ngay câu hỏi: "Màu này còn không? Đang ở đâu?"

* **Thanh tìm kiếm/Lọc:** \[Chọn Mẫu Xe\] \[Chọn Màu\]  
* **Hiển thị kết quả:**  
  * **EVO GRAND \- Màu Trắng:**  
    * 1 xe tại **TA1** (Tag Xanh: Có sẵn để bán)  
    * 2 xe tại **Kho Tổng** (Tag Xanh: Có thể điều chuyển)  
  * **EVO GRAND \- Màu Đỏ:**  
    * 1 xe tại **TA2** (Tag Vàng: Đã có khách cọc) \-\> *Không hiển thị tên khách của Sale khác.*  
    * 0 xe tại **TA1** (Tag Đỏ: Hết hàng).