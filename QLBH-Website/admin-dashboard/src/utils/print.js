import { vnd, dateTimeVN } from '../format'
import { api } from '../api'

export async function printReceipt(orderSummary) {
  // Tải chi tiết đơn hàng (vì orderSummary chỉ có thông tin tổng quan)
  let order = {}
  try {
    order = await api.orderDetail(orderSummary.order_no)
  } catch (e) {
    alert("Lỗi không thể tải chi tiết đơn hàng để in!")
    return
  }

  const w = window.open('', '_blank', 'width=800,height=900')
  const date = new Date()
  
  const c = order.customer || {}
  const v = order.vehicle || {}
  
  const h = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>In Phiếu Bán Hàng - ${order.order_no}</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; font-size: 14px; margin: 0; padding: 20px 40px; color: #000; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
      .logo-section { display: flex; gap: 15px; }
      .logo-img { width: 70px; height: auto; }
      .company-info h2 { margin: 0 0 5px 0; font-size: 18px; color: #000; }
      .company-info p { margin: 2px 0; font-size: 12px; }
      .title-section { text-align: center; flex: 1; }
      .title-section h1 { margin: 10px 0 5px 0; font-size: 24px; letter-spacing: 1px; }
      .title-section p { margin: 0; font-size: 14px; font-style: italic; }
      .receipt-no { text-align: right; width: 250px; }
      .receipt-no span { color: red; font-weight: bold; font-size: 18px; }
      
      h3 { font-size: 15px; margin: 15px 0 10px 0; font-weight: bold; }
      
      .row { display: flex; margin-bottom: 8px; line-height: 1.5; }
      .col { flex: 1; }
      
      table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: center; }
      th { font-weight: bold; background: #fff; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      
      .bold { font-weight: bold; }
      
      .payment-table { width: 100%; border: 1px solid #000; margin-bottom: 15px; border-collapse: collapse; }
      .payment-table td { border: 1px solid #000; padding: 8px; }
      
      .footer { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; font-weight: bold; }
      .footer div { flex: 1; }
      
      .checkbox { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; margin-right: 5px; position: relative; top: 2px; }
      
      .dotted { border-bottom: 1px dotted #000; flex: 1; margin: 0 5px; position: relative; top: -5px; }
      
      .notice { display: flex; gap: 15px; margin-top: 15px; align-items: center; }
      .notice-icon { font-size: 40px; font-weight: bold; }
      
      .bottom-note { text-align: center; font-size: 11px; font-style: italic; margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; }
      
      @media print {
        @page { margin: 1cm; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="logo-section">
        <div style="font-size: 45px; font-weight: bold; line-height: 1; font-family: sans-serif;">V</div>
        <div class="company-info">
          <h2>VINFAST THU ANH</h2>
          <p><b>CS1:</b> 63C Nguyễn Hoàng, P. Từ Liêm, TP. Hà Nội</p>
          <p><b>CS2:</b> 193 Trung Kính, P. Yên Hòa, TP. Hà Nội</p>
          <p><b>CS3:</b> G1, G2 - LK19, Khu ĐTM Dương Nội, Hà Đông</p>
          <p><b>Hotline:</b> 0339.636.669</p>
        </div>
      </div>
      <div class="title-section">
        <h1>PHIẾU BÁN HÀNG</h1>
        <p>Ngày: ${String(date.getDate()).padStart(2, '0')} / ${String(date.getMonth()+1).padStart(2, '0')} / ${date.getFullYear()}</p>
      </div>
      <div class="receipt-no">
        Số phiếu: VF/${String(date.getMonth()+1).padStart(2, '0')}/20${String(date.getFullYear()).slice(2)}/<span>${order.order_no.replace('DH', '')}</span>
      </div>
    </div>
    
    <h3>A - Thông tin Khách hàng:</h3>
    <div class="row">Họ và tên: <div class="dotted">${c.name || ''}</div> Giới tính: <span class="checkbox"></span> Nam &nbsp;&nbsp; <span class="checkbox"></span> Nữ</div>
    <div class="row">Sinh ngày: <div class="dotted"></div> CCCD: <div class="dotted">${c.cccd || ''}</div> Ngày cấp: <div class="dotted"></div></div>
    <div class="row">Điện thoại: <div class="dotted">${c.phone || ''}</div> Email: <div class="dotted"></div></div>
    <div class="row">Địa chỉ: <div class="dotted">${c.address || ''}</div></div>
    
    <div style="margin-top: 10px;">
      Anh chị biết đến cửa hàng thông qua: 
      <span class="checkbox"></span> Facebook &nbsp;
      <span class="checkbox"></span> Tiktok &nbsp;
      <span class="checkbox"></span> Google map &nbsp;
      <span class="checkbox"></span> Đi qua cửa hàng &nbsp;
      <span class="checkbox"></span> Khác
    </div>
    <div style="margin-top: 10px;">
      Mục đích mua xe: 
      <span class="checkbox"></span> Đi làm &nbsp;
      <span class="checkbox"></span> Đi học &nbsp;
      <span class="checkbox"></span> Giao hàng &nbsp;
      <span class="checkbox"></span> Chạy dịch vụ &nbsp;
      <span class="checkbox"></span> Khác
    </div>

    <h3>B - Thông tin xe máy:</h3>
    <div class="row">Loại xe: <div class="dotted">${v.model || ''}</div> Màu xe: <div class="dotted">${v.color || ''}</div></div>
    <div class="row">Số khung: <div class="dotted">${v.vin || ''}</div> Serial Pin: <div class="dotted"></div></div>
    
    <table>
      <thead>
        <tr>
          <th width="5%">TT</th>
          <th width="45%">Tên hàng</th>
          <th width="10%">Số lượng</th>
          <th width="20%">Đơn giá</th>
          <th width="20%">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${(order.details || []).map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="text-left">${d.model || d.service || 'Sản phẩm'} ${d.promo ? '(Đã áp mã '+d.promo+')' : ''}</td>
          <td>1</td>
          <td class="text-right">${vnd(d.unit_price)}</td>
          <td class="text-right">${vnd(d.final_price)}</td>
        </tr>`).join('')}
        ${Array.from({length: Math.max(0, 5 - (order.details?.length || 0))}).map((_, i) => `
        <tr><td>${(order.details?.length||0) + i + 1}</td><td></td><td></td><td></td><td></td></tr>
        `).join('')}
        <tr>
          <td colspan="4" class="bold text-center">TỔNG TIỀN</td>
          <td class="bold text-right">${vnd(order.total)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="row" style="align-items: center; margin-bottom: 10px;">
      <span class="bold" style="width: 150px;">C - Thanh toán:</span>
      <span class="checkbox" ${order.payment_status==='paid' ? 'style="background: #000;"' : ''}></span> Tiền mặt &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span class="checkbox" ${order.payment_status==='paid' ? 'style="background: #000;"' : ''}></span> Chuyển khoản &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> Trả góp
    </div>
    
    <table class="payment-table">
      <tr>
        <td width="20%" class="bold text-center">Đã thanh toán</td>
        <td width="40%" class="text-center">Tiền mặt</td>
        <td width="40%" class="text-center">Chuyển khoản</td>
      </tr>
      <tr>
        <td class="bold text-center">Ngân hàng (Trả góp)</td>
        <td colspan="2">Mã HS: <div class="dotted" style="display:inline-block; width:200px;"></div> Số tiền: <div class="dotted" style="display:inline-block; width:200px;"></div></td>
      </tr>
      <tr>
        <td class="bold text-center" rowspan="2">Số tiền còn lại</td>
        <td colspan="2">
          Tiền xe: <div class="dotted" style="display:inline-block; width:150px;"></div> 
          Tiền ĐK: <div class="dotted" style="display:inline-block; width:150px;"></div> 
          Khác: <div class="dotted" style="display:inline-block; width:100px;"></div>
        </td>
      </tr>
      <tr>
        <td colspan="2" class="bold">Ngày thanh toán:</td>
      </tr>
    </table>
    
    <div class="row">
      Ngày trả biển số + CMT: <div class="dotted"></div> Ngày trả đăng ký: <div class="dotted"></div>
    </div>
    
    <div class="notice">
      <div class="notice-icon">⚠</div>
      <div style="flex: 1;">
        <div style="margin-bottom: 10px;">
          Khách đã nhận: &nbsp;&nbsp;
          <span class="checkbox"></span> 1 Hóa đơn đỏ; &nbsp;&nbsp;&nbsp;&nbsp;
          <span class="checkbox"></span> 1 đăng kiểm; &nbsp;&nbsp;&nbsp;&nbsp;
          <span class="checkbox"></span> ....... chìa khóa;
        </div>
        <div>Xe và đầy đủ phụ kiện theo xe.</div>
      </div>
    </div>
    
    <div class="row" style="margin-top: 15px;">
      Ghi chú khác: <div class="dotted"></div>
    </div>
    
    <div class="footer">
      <div>Khách hàng xác nhận</div>
      <div>Nhân viên bán hàng</div>
      <div>Kế toán</div>
    </div>
    
    <div class="bottom-note">
      VinFast Thu Anh luôn tận tâm phục vụ Quý khách. Mọi ý kiến đóng góp về chất lượng sản phẩm và phong cách phục vụ, vui lòng liên hệ: Hà - 098 883 4799 | Lan Anh - 091 680 5995
    </div>
    
    <script>
      window.onload = function() {
        window.print();
      }
    </script>
  </body>
  </html>
  `
  w.document.write(h)
  w.document.close()
}
