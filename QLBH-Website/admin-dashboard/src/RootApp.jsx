import { useState } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';
import { api } from './api';

function readStoredUser() {
  const saved = localStorage.getItem('qlbh_user');
  const token = localStorage.getItem('qlbh_token');
  if (!saved || !token) return null;
  try {
    if (api.setToken) api.setToken(token);
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem('qlbh_user');
    localStorage.removeItem('qlbh_token');
    return null;
  }
}

export default function RootApp() {
  const [user, setUser] = useState(readStoredUser);

  if (!user) {
    return <Login onLogin={setUser} />;
  }
  return <App user={user} onLogout={() => { localStorage.clear(); setUser(null); }} />;
}
