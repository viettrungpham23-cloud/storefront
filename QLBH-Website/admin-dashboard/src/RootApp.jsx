import { useState, useEffect } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';
import { api } from './api';

export default function RootApp() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('qlbh_user');
    const token = localStorage.getItem('qlbh_token');
    if (saved && token) {
      if (api.setToken) api.setToken(token);
      setUser(JSON.parse(saved));
    }
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }
  return <App user={user} onLogout={() => { localStorage.clear(); setUser(null); }} />;
}
