import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', url_path: '', status: 'active' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetch = async () => {
    try { setProjects(await api.getProjects()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditId(null); setForm({ name: '', url_path: '', status: 'active' }); setError(''); setShowModal(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ name: p.name, url_path: p.url_path, status: p.status }); setError(''); setShowModal(true); };

  const save = async () => {
    try {
      if (editId) { await api.updateProject(editId, form); } else { await api.createProject(form); }
      setShowModal(false); fetch();
    } catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Hapus proyek ini?')) return;
    try { await api.deleteProject(id); fetch(); } catch (e) { setError(e.message); }
  };

  if (loading) return <div className="text-center mt-16"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div><h2>Daftar Proyek</h2></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Proyek</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {projects.length === 0 ? (
        <div className="card"><div className="card-body text-center text-muted">Belum ada proyek.</div></div>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>No</th><th>Nama Proyek</th><th>URL</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td><strong>{p.name}</strong></td>
                  <td><code>jatismobile.com/{p.url_path}</code></td>
                  <td><span className={`badge ${p.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{p.status === 'active' ? 'Aktif' : 'Tidak Aktif'}</span></td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/projects/${p.id}/config`)}>Konfigurasi</button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Hapus</button>
                      <button className="btn btn-success btn-sm" onClick={() => window.open(`https://pengundian-app-udrl.vercel.app/landing/${p.url_path}`, '_blank')}>Link</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Tambah'} Proyek</h3><button className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>X</button></div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group"><label>Nama Proyek</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>URL Path</label><input value={form.url_path} onChange={e => setForm({ ...form, url_path: e.target.value.replace(/\s/g, '-').toLowerCase() })} /><div className="text-muted">jatismobile.com/{form.url_path || 'nama-project'}</div></div>
              <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Aktif</option><option value="inactive">Tidak Aktif</option></select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button><button className="btn btn-primary" onClick={save}>Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
