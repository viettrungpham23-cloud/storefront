# **Tài liệu Thiết kế Cơ sở Dữ liệu và Đặc tả API Hệ thống Xe điện**

Tài liệu này cung cấp toàn bộ mã khởi tạo cơ sở dữ liệu quan hệ hoàn chỉnh và kịch bản giao tiếp API phục vụ quy trình đồng bộ đa kênh từ Ứng dụng di động (App) đến Hệ quản trị trung tâm (Website Admin).

## **1\. Mã Khởi Tạo Cơ Sở Dữ Liệu (PostgreSQL DDL)**

Mã lệnh thiết lập toàn bộ cấu trúc bảng, ràng buộc toàn vẹn dữ liệu để quản lý chi tiết thông tin khách hàng, số khung, số máy, nhật ký luân chuyển kho và các luồng đối soát dòng tiền tài chính.

\-- 1\. Bảng Khách hàng (Tự động sinh mã khách hàng bằng UUID)  
CREATE TABLE customers (  
    customer\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    full\_name VARCHAR(100) NOT NULL,  
    cccd\_number VARCHAR(12) UNIQUE NOT NULL,  
    cccd\_address TEXT NOT NULL,  
    delivery\_address TEXT NOT NULL,  
    phone VARCHAR(15) NOT NULL,  
    email VARCHAR(100)  
);

\-- 2\. Bảng Biến thể Sản phẩm (Phân loại theo chủng loại và màu sắc)  
CREATE TABLE product\_variants (  
    sku\_color VARCHAR(50) PRIMARY KEY,  
    sku\_type VARCHAR(50) NOT NULL,  
    color\_code VARCHAR(10) NOT NULL,  
    price\_base INT NOT NULL  
);

\-- 3\. Bảng Kho hàng Thực tế (Gắn chặt với Số khung IMEI 1 và Số máy IMEI 2\)  
CREATE TABLE inventory\_items (  
    vin\_code VARCHAR(50) PRIMARY KEY,  
    sku\_color VARCHAR(50) REFERENCES product\_variants(sku\_color),  
    frame\_number\_imei1 VARCHAR(50) UNIQUE NOT NULL,  
    engine\_number\_imei2 VARCHAR(50) UNIQUE NOT NULL,  
    import\_unit\_id VARCHAR(50) NOT NULL,  
    current\_unit\_id VARCHAR(50) NOT NULL,  
    import\_time TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    status VARCHAR(20) DEFAULT 'available' \-- available, reserved, sold  
);

\-- 4\. Bảng Nhật ký Hành vi Dịch chuyển Hàng hóa  
CREATE TABLE inventory\_logs (  
    log\_id SERIAL PRIMARY KEY,  
    vin\_code VARCHAR(50) REFERENCES inventory\_items(vin\_code),  
    from\_unit VARCHAR(50),  
    to\_unit VARCHAR(50),  
    action\_type VARCHAR(30) NOT NULL, \-- Nhập kho, Điều chuyển, Xuất bán  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

\-- 5\. Bảng Chương trình Khuyến mại (Quản lý nhiều mã từ Hãng)  
CREATE TABLE promotions (  
    promo\_code VARCHAR(50) PRIMARY KEY,  
    discount\_value INT NOT NULL,  
    sponsor VARCHAR(50) NOT NULL, \-- Nhà tài trợ mã (Hãng/Đại lý)  
    expired\_at TIMESTAMP NOT NULL  
);

\-- 6\. Bảng Linh kiện Phụ kiện Đi kèm  
CREATE TABLE accessories (  
    part\_sku VARCHAR(50) PRIMARY KEY,  
    name VARCHAR(100) NOT NULL,  
    price INT NOT NULL,  
    stock\_quantity INT DEFAULT 0  
);

\-- 7\. Bảng Dịch vụ Giá trị Gia tăng (VAS)  
CREATE TABLE value\_added\_services (  
    service\_code VARCHAR(50) PRIMARY KEY,  
    service\_name VARCHAR(100) NOT NULL,  
    fee INT NOT NULL  
);

\-- 8\. Bảng Đơn hàng Tổng hợp (Quản lý số hóa đơn và thời gian xuất nhập)  
CREATE TABLE orders (  
    order\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    customer\_id UUID REFERENCES customers(customer\_id),  
    invoice\_number VARCHAR(50) UNIQUE,  
    delivery\_address TEXT NOT NULL,  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    export\_time TIMESTAMP,  
    admin\_status VARCHAR(20) DEFAULT 'pending' \-- pending, verified, completed  
);

\-- 9\. Bảng Chi tiết Đơn hàng (Cầu nối liên kết thông tin giỏ hàng đa tầng)  
CREATE TABLE order\_details (  
    detail\_id SERIAL PRIMARY KEY,  
    order\_id UUID REFERENCES orders(order\_id),  
    vin\_code VARCHAR(50) REFERENCES inventory\_items(vin\_code),  
    part\_sku VARCHAR(50) REFERENCES accessories(part\_sku),  
    service\_code VARCHAR(50) REFERENCES value\_added\_services(service\_code),  
    promo\_code VARCHAR(50) REFERENCES promotions(promo\_code),  
    quantity INT DEFAULT 1,  
    final\_price INT NOT NULL  
);

\-- 10\. Bảng Quản lý Giao dịch Thanh toán Đa kênh  
CREATE TABLE payments (  
    payment\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    order\_id UUID REFERENCES orders(order\_id),  
    payment\_method VARCHAR(30) NOT NULL, \-- Tiền mặt, Chuyển khoản, POS, Thẻ đồng thương hiệu/BNPL  
    amount\_paid INT NOT NULL,  
    reference\_code VARCHAR(100), \-- Mã tham chiếu từ ngân hàng/thiết bị quẹt thẻ  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

\-- 11\. Bảng Theo dõi Công nợ Đối tác Tài chính (Phục vụ luồng Trả góp/BNPL)  
CREATE TABLE debts (  
    debt\_id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    customer\_id UUID REFERENCES customers(customer\_id),  
    order\_id UUID REFERENCES orders(order\_id),  
    principal\_amount INT NOT NULL,  
    due\_date TIMESTAMP NOT NULL,  
    fin\_partner\_id VARCHAR(50) NOT NULL \-- Định danh tổ chức cấp tín dụng  
);

\-- 12\. Nhật ký Đối soát Kế toán (Xác minh tiền nổi thực tế)  
CREATE TABLE reconciliation\_logs (  
    recon\_id SERIAL PRIMARY KEY,  
    payment\_id UUID REFERENCES payments(payment\_id),  
    status VARCHAR(20) DEFAULT 'unreconciled', \-- unreconciled, matched, discrepancy  
    verified\_at TIMESTAMP  
);

## **2\. Đặc Tả Giao Tiếp API (RESTful API Blueprint)**

Các cổng giao tiếp trung gian xử lý luồng dữ liệu thời gian thực giữa các nền tảng ứng dụng di động và hệ thống website admin nội bộ.

| Phương thức | Đường dẫn (Endpoint) | Mục đích & Sử dụng |
| :---- | :---- | :---- |
| **POST** | /api/v1/orders/checkout | Khách hàng chốt đơn trên App. Hệ thống tự động lưu thông tin cá nhân, sinh mã Khách hàng, tạo đơn hàng trạng thái chờ duyệt và đổi trạng thái mã VIN/IMEI sang 'reserved' để tạm khóa giữ hàng. |
| **PATCH** | /api/v1/admin/orders/verify | Nhân viên kho mở Website Admin đối soát thực tế chiếc xe (số khung, số máy), cập nhật mã màu và phê duyệt chứng từ chuyển trạng thái sang 'vin\_verified'. |
| **POST** | /api/v1/payments/webhook | Ghi nhận phản hồi tự động kết quả dòng tiền (tiền mặt, quẹt thẻ POS hoặc khế ước giải ngân từ giải pháp tài chính trả góp/BNPL), tự động điền số hóa đơn chứng từ hợp lệ. |

