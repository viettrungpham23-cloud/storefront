import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Badge, Table, Button, Input, Select } from '../ui';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('sales');
  const [unitCode, setUnitCode] = useState('TA1');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.users();
      setUsers(data);
    } catch (e) {
      alert("Lỗi tải danh sách người dùng: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    api.users()
      .then((data) => { if (!ignore) setUsers(data); })
      .catch((e) => { if (!ignore) alert("Lỗi tải danh sách người dùng: " + e.message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.userCreate({ email, name, role, unit_code: unitCode });
      setEmail(''); setName('');
      loadUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.userUpdate(u.email, { is_active: u.is_active ? 0 : 1 });
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  const updateRole = async (u, newRole) => {
    try {
      await api.userUpdate(u.email, { role: newRole });
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Quản lý Nhân sự</h2>
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 12, marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Thêm mới</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</div>
            <Input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Ví dụ: nva@gmail.com" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tên hiển thị</div>
            <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Nguyễn Văn A" />
          </div>
          <div style={{ width: 150 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phân quyền</div>
            <Select value={role} onChange={e => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
            </Select>
          </div>
          <div style={{ width: 150 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Đơn vị</div>
            <Select value={unitCode} onChange={e => setUnitCode(e.target.value)}>
              <option value="A">Đơn vị A (TA1)</option>
              <option value="B">Đơn vị B (TA2)</option>
              <option value="C">Đơn vị C (TA3)</option>
            </Select>
          </div>
          <Button type="submit" variant="primary">Thêm</Button>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <Table
          headers={["Email", "Tên", "Cơ sở", "Quyền", "Trạng thái", "Thao tác"]}
          data={users}
          loading={loading}
          renderRow={(u) => (
            <tr key={u.email}>
              <td style={{ fontWeight: 500 }}>{u.email}</td>
              <td>{u.name}</td>
              <td>{u.unit_code}</td>
              <td>
                <Select value={u.role} onChange={e => updateRole(u, e.target.value)} style={{ padding: '4px 8px', fontSize: 13 }}>
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                </Select>
              </td>
              <td>
                <Badge variant={u.is_active ? 'success' : 'neutral'}>
                  {u.is_active ? 'Hoạt động' : 'Tạm khóa'}
                </Badge>
              </td>
              <td>
                <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>
                  {u.is_active ? 'Khóa' : 'Mở khóa'}
                </Button>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
}
