// Đoạn code nhúng vào cuối app.js
SCREENS.login = (entry) => {
  const s = el(`<section class="screen login-screen" style="background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:24px;text-align:center;">
    <div style="background:#fff;padding:36px 24px;border-radius:24px;width:100%;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,.2);">
      <img src="assets/icon.png" style="width:72px;height:72px;margin-bottom:16px;border-radius:18px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Đăng nhập hệ thống</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">Dành riêng cho nhân sự VinFast Thu Anh</p>
      
      <div id="gg-btn-wrap" style="display:flex;justify-content:center;margin-bottom:20px;min-height:44px;">
        <button class="btn btn-primary" id="btn-mock-login" style="display:none;width:100%;">Đăng nhập (Mock)</button>
      </div>

      <div style="font-size:12px;color:#94a3b8;line-height:1.5;">
        * Hệ thống yêu cầu tài khoản Google nội bộ.<br>
        Vui lòng sử dụng email công ty đã được cấp quyền.
      </div>
    </div>
  </section>`);

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
          }
        } catch (e) { toast('Lỗi đăng nhập: ' + e); }
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
