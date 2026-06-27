import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { api, API_BASE } from './api';

export default function Login({ onLogin }) {
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        throw new Error('Google không trả credential đăng nhập. Kiểm tra OAuth Authorized JavaScript origins cho domain đang dùng.');
      }
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('Google login success:', decoded);
      // Send token to backend to verify and get our own JWT or session
      const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        throw new Error(data.detail || raw || `Backend verification failed (${res.status})`);
      }
      if (!data.access_token || !data.user) {
        throw new Error('Backend không trả phiên đăng nhập hợp lệ.');
      }
      
      // Save our internal token and user info
      localStorage.setItem('qlbh_token', data.access_token);
      localStorage.setItem('qlbh_user', JSON.stringify(data.user));
      
      // Update axios default header
      api.setToken(data.access_token);
      onLogin(data.user);
    } catch (err) {
      console.error(err);
      setError('Đăng nhập thất bại: ' + (err?.message || err));
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 24, boxShadow: 'var(--shadow-lg)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <img src="/logo.png" alt="TA innovation" style={{ height: 48, marginBottom: 24 }} />
        <h2 style={{ marginBottom: 8 }}>Đăng nhập Hệ thống</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>Dành riêng cho Cán bộ nhân viên VinFast Thu Anh</p>
        
        {/* LƯU Ý: VITE_GOOGLE_CLIENT_ID phải được thiết lập trong .env */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Đăng nhập Google thất bại.')}
            useOneTap
          />
        </div>
        
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</div>}
        
        <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 24 }}>
          * Nếu bạn chưa có tài khoản, hệ thống sẽ tự động cấp quyền truy cập cơ bản.
        </div>
      </div>
    </div>
  );
}
