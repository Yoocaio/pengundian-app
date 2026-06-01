import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [msg, setMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { api.getUsers().then(setUsers).finally(() => setLoading(false)); }, []);

  const openAdd = () => { setEditId(null); setForm({ email: '', password: '', name: '', confirmPassword: '' }); setMsg(''); setShowForm(true); };
  const openEdit = (u) => { setEditId(u.id); setForm({ email: u.email, password: '', name: u.name, confirmPassword: '' }); setMsg(''); setShowForm(true); };

  const save = async () => {
    if (!form.email) return setMsg('Email wajib diisi');
    if (!form.name) return setMsg('Nama wajib diisi');
    if (!editId && !form.password) return setMsg('Password wajib diisi');
    if (form.password && form.password !== form.confirmPassword) return setMsg('Konfirmasi password tidak cocok');
    if (form.password && form.password.length < 8) return setMsg('Password minimal 8 karakter');
    if (form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(form.password)) return setMsg('Password harus mengandung huruf besar, huruf kecil, angka, dan simbol (!@#$%^&*)');
    try {
      if (editId) await api.updateUser(editId, form);
      else await api.createUser(form);
      setShowForm(false);
      setUsers(await api.getUsers());
    } catch (e) { setMsg(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Hapus user?')) return;
    try { await api.deleteUser(id); setUsers(await api.getUsers()); }
    catch (e) { setMsg(e.message); }
  };

  if (loading) return <div className="text-center mt-16"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex-between">
        <h2>User Management</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ User</button>
      </div>
      {msg && <div className={`alert ${msg.includes('berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="card">
        <table>
          <thead><tr><th>No</th><th>Nama</th><th>Email</th><th>Role</th><th>Aksi</th></tr></thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td><span className="badge badge-active">{u.role}</span></td>
                <td className="flex gap-8">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>
                  {users.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => remove(u.id)}>Hapus</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Tambah'} User</h3><button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>X</button></div>
            <div className="modal-body">
              {msg && <div className="alert alert-error">{msg}</div>}
              <div className="form-group"><label>Nama</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@jatismobile.com" /></div>
              <div className="form-group"><label>Password {editId && <span className="text-muted">(kosongkan jika tidak berubah)</span>}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Minimal 8 karakter" />
                  <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: 10, cursor: 'pointer', fontSize: 16, opacity: 0.5, userSelect: 'none' }}>{showPassword ? '🙈' : '👁'}</span>
                </div>
                <div className="text-muted" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.5 }}>
                  Minimal 8 karakter, harus mengandung:<br />
                  • Huruf besar (A-Z) &nbsp; • Huruf kecil (a-z)<br />
                  • Angka (0-9) &nbsp; • Simbol (!@#$%^&*)
                </div>
              </div>
              <div className="form-group"><label>Konfirmasi Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Ulangi password" />
                </div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Batal</button><button className="btn btn-primary" onClick={save}>Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
