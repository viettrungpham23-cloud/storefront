// Đoạn code nhúng vào cuối app.js
SCREENS.login = (entry) => {
  const s = el(`<section class="screen login-screen" style="background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:24px;text-align:center;">
    <div style="background:#fff;padding:36px 24px;border-radius:24px;width:100%;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,.2);">
      <img src="/assets/logo.png" style="display:block;height:80px;width:auto;margin:0 auto 20px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Đăng nhập hệ thống</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Nhân viên đăng nhập bằng Google — khách hàng chỉ cần họ tên & SĐT</p>

      <div id="gg-btn-wrap" style="display:flex;justify-content:center;margin-bottom:20px;min-height:44px;">
        <button class="btn btn-primary" id="btn-mock-login" style="display:none;width:100%;">Đăng nhập (Mock)</button>
      </div>

      <div style="display:flex;align-items:center;gap:12px;margin:4px 0 16px;color:#94a3b8;font-size:12px;">
        <span style="flex:1;height:1px;background:#e2e8f0;"></span>hoặc<span style="flex:1;height:1px;background:#e2e8f0;"></span>
      </div>

      <div style="text-align:left;display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
        <input id="guest-name" type="text" placeholder="Họ và tên" autocomplete="name"
          style="width:100%;padding:12px 14px;border:1px solid #cbd5e1;border-radius:12px;font-size:15px;color:#0f172a;">
        <input id="guest-phone" type="tel" placeholder="Số điện thoại (10 số)" autocomplete="tel" maxlength="12"
          style="width:100%;padding:12px 14px;border:1px solid #cbd5e1;border-radius:12px;font-size:15px;color:#0f172a;">
        <button class="btn btn-primary" id="btn-guest-login" style="width:100%;">Tiếp tục với tư cách khách</button>
      </div>

      <div style="font-size:12px;color:#94a3b8;line-height:1.5;">
        * Nhân viên VinFast Thu Anh: dùng email công ty đã được cấp quyền.<br>
        Khách hàng bên ngoài: nhập họ tên & SĐT để mua sắm ngay.
      </div>
    </div>
  </section>`);

  const guestBtn = s.querySelector('#btn-guest-login');
  const doGuestLogin = async () => {
    const name = s.querySelector('#guest-name').value.trim();
    const phone = s.querySelector('#guest-phone').value.trim();
    if (name.length < 2) return toast('Vui lòng nhập họ tên');
    if (!/^0\d{9}$/.test(phone.replace(/\D/g, '').replace(/^84/, '0'))) return toast('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)');
    guestBtn.disabled = true;
    try {
      const r = await fetch(API_BASE + '/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Đăng nhập thất bại');
      localStorage.setItem('ta_token', data.access_token);
      localStorage.setItem('ta_user', JSON.stringify(data.user));
      state.checkout.name = state.checkout.name || data.user.name;
      state.checkout.phone = state.checkout.phone || data.user.phone;
      toast('Chào mừng ' + data.user.name + '!');
      navTab('home');
    } catch (e) {
      toast('Lỗi: ' + e.message);
    } finally {
      guestBtn.disabled = false;
    }
  };
  guestBtn.onclick = doGuestLogin;
  s.querySelector('#guest-phone').addEventListener('keydown', e => { if (e.key === 'Enter') doGuestLogin(); });

  const wrap = s.querySelector('#gg-btn-wrap');
  const initGG = () => {
    let GoogleAuth = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins.GoogleAuth : null;
    if (GoogleAuth) {
      if (!window.__googleAuthInit) { GoogleAuth.initialize(); window.__googleAuthInit = true; }
      const btn = el(`<button class="btn btn-primary" style="width:100%;background:#fff;color:#334155;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;gap:8px;">
        <img src="https://www.google.com/favicon.ico" width="18"> Đăng nhập bằng Google
      </button>`);
      wrap.innerHTML = ''; wrap.appendChild(btn);
      btn.onclick = async () => {
        try {
          const user = await GoogleAuth.signIn();
          if (user && user.authentication && user.authentication.idToken) {
            await handleLoginToken(user.authentication.idToken);
          } else {
            throw new Error('Google không trả ID token. APK có thể chưa được ký bằng khóa đã đăng ký OAuth.');
          }
        } catch (e) { toast('Lỗi đăng nhập: ' + (e && e.message ? e.message : e)); }
      };
    } else if (window.google && google.accounts) {
      google.accounts.id.initialize({
        client_id: document.querySelector('meta[name="google-signin-client_id"]').content,
        callback: async (res) => { await handleLoginToken(res.credential); }
      });
      google.accounts.id.renderButton(wrap, { theme: 'outline', size: 'large', width: 280, shape: 'pill' });
    } else {
      setTimeout(initGG, 500); // Retry if library not loaded
    }
  };
  
  // Call init
  requestAnimationFrame(initGG);
  
  return s;
};

async function handleLoginToken(token) {
  try {
    const res = await fetch(ADMIN_API_BASE + '/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Xác thực thất bại');
    
    localStorage.setItem('ta_token', data.access_token);
    localStorage.setItem('ta_user', JSON.stringify(data.user));
    toast('Đăng nhập thành công: ' + data.user.name);
    navTab('catalog'); // Vào trang chính
  } catch (e) {
    toast('Lỗi: ' + e.message);
  }
}
