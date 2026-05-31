import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

const TABS = ['Kolom Data', 'Kategori Hadiah', 'Hadiah', 'Peserta Undian', 'Logic', 'Landing Page'];

export default function Config() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [project, setProject] = useState(null);

  useEffect(() => {
    api.getProject(id).then(setProject).catch(() => navigate('/projects'));
  }, [id]);

  if (!project) return <div className="text-center mt-16"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Konfigurasi: {project.name}</h2>
          <p className="text-muted">jatismobile.com/{project.url_path}</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/projects')}>Kembali</button>
      </div>
      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={i} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>
      {tab === 0 && <ColumnsTab pid={id} />}
      {tab === 1 && <CategoriesTab pid={id} />}
      {tab === 2 && <PrizesTab pid={id} />}
      {tab === 3 && <ParticipantsTab pid={id} />}
      {tab === 4 && <LogicTab pid={id} />}
      {tab === 5 && <LandingTab pid={id} />}
    </div>
  );
}

function ColumnsTab({ pid }) {
  const [cols, setCols] = useState([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.getColumns(pid).then(setCols); }, [pid]);

  const add = () => {
    if (cols.length >= 10) return setMsg('Maksimum 10 kolom');
    setCols([...cols, { id: Date.now(), name: '', show_on_web: false, masking_6digit: false, _new: true }]);
  };
  const remove = async (c) => {
    if (!c._new) { try { await api.deleteColumn(pid, c.id); } catch (e) { return setMsg(e.message); } }
    setCols(cols.filter(x => x.id !== c.id));
  };
  const save = async () => {
    for (const c of cols) {
      if (!c.name.trim()) return setMsg('Semua kolom harus diisi');
      if (c._new) await api.createColumn(pid, { name: c.name, show_on_web: c.show_on_web, masking_6digit: c.masking_6digit });
      else await api.updateColumn(pid, c.id, { name: c.name, show_on_web: c.show_on_web, masking_6digit: c.masking_6digit });
    }
    setMsg('Berhasil disimpan');
    api.getColumns(pid).then(setCols);
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <p className="text-muted">Definisikan kolom data peserta (maks 10).</p>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Kolom</button>
      </div>
      {msg && <div className={`alert ${msg.includes('Berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="card">
        <table>
          <thead><tr><th>No</th><th>Nama Kolom</th><th>Tampilkan di Web</th><th>Masking 6 Digit</th><th></th></tr></thead>
          <tbody>
            {cols.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td><input value={c.name} onChange={e => setCols(cols.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} style={{ width: '100%' }} /></td>
                <td className="text-center"><input type="checkbox" checked={c.show_on_web} onChange={e => setCols(cols.map(x => x.id === c.id ? { ...x, show_on_web: e.target.checked } : x))} /></td>
                <td className="text-center"><input type="checkbox" checked={c.masking_6digit} onChange={e => setCols(cols.map(x => x.id === c.id ? { ...x, masking_6digit: e.target.checked } : x))} /></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => remove(c)}>X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {cols.length === 0 && <div className="card-body text-center text-muted">Belum ada kolom.</div>}
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={save}>Simpan</button>
      </div>
    </div>
  );
}

function CategoriesTab({ pid }) {
  const [cats, setCats] = useState([]);
  const [msg, setMsg] = useState('');
  const defaults = ['Hadiah Utama', 'Hadiah Menengah', 'Hadiah Pendukung'];
  useEffect(() => { api.getCategories(pid).then(setCats); }, [pid]);

  const add = () => setCats([...cats, { id: Date.now(), name: '', is_default: false, _new: true }]);
  const remove = async (c) => {
    if (c.is_default) return setMsg('Kategori default tidak dapat dihapus');
    if (!c._new) await api.deleteCategory(pid, c.id);
    setCats(cats.filter(x => x.id !== c.id));
  };
  const save = async () => {
    for (const c of cats) {
      if (!c.name.trim()) return setMsg('Semua kategori harus diisi');
      if (c._new) await api.createCategory(pid, { name: c.name });
    }
    setMsg('Berhasil disimpan');
    api.getCategories(pid).then(setCats);
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <p className="text-muted">3 kategori default tidak dapat dihapus. Bisa tambah custom.</p>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Kategori</button>
      </div>
      {msg && <div className={`alert ${msg.includes('Berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="card">
        <table>
          <thead><tr><th>No</th><th>Nama Kategori</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...defaults.map((d, i) => ({ id: -i, name: d, is_default: true })), ...cats].map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td>{c.is_default ? <strong>{c.name}</strong> : <input value={c.name} onChange={e => setCats(cats.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} />}</td>
                <td><span className="badge" style={{ background: c.is_default ? '#e3f2fd' : '#fef9e7', color: c.is_default ? '#1565c0' : '#946b0a' }}>{c.is_default ? 'Default' : 'Custom'}</span></td>
                <td>{!c.is_default && <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>X</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={save}>Simpan</button>
      </div>
    </div>
  );
}

function PrizesTab({ pid }) {
  const [prizes, setPrizes] = useState([]);
  const [cats, setCats] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getPrizes(pid).then(setPrizes);
    api.getCategories(pid).then(data => {
      const d = ['Hadiah Utama', 'Hadiah Menengah', 'Hadiah Pendukung'];
      setCats([...d, ...data.map(c => c.name)]);
    });
  }, [pid]);

  const add = () => setPrizes([...prizes, { id: Date.now(), name: '', category: 'Hadiah Utama', qty: 1, image_url: null, _new: true }]);
  const remove = async (p) => { if (!p._new) await api.deletePrize(pid, p.id); setPrizes(prizes.filter(x => x.id !== p.id)); };

  const save = async () => {
    for (const p of prizes) {
      if (!p.name.trim()) return setMsg('Semua hadiah harus diisi');
      const fd = new FormData();
      fd.append('name', p.name); fd.append('category', p.category); fd.append('qty', p.qty);
      if (p._file) fd.append('image', p._file);
      if (p._new) await api.createPrize(pid, fd);
      else await api.updatePrize(pid, p.id, fd);
    }
    setMsg('Berhasil disimpan');
    api.getPrizes(pid).then(setPrizes);
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <p className="text-muted">Tambahkan hadiah yang akan diundi.</p>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Hadiah</button>
      </div>
      {msg && <div className={`alert ${msg.includes('Berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="card">
        <table>
          <thead><tr><th>No</th><th>Nama Hadiah</th><th>Kategori</th><th>Qty</th><th>Gambar</th><th></th></tr></thead>
          <tbody>
            {prizes.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td><input value={p.name} onChange={e => setPrizes(prizes.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} /></td>
                <td><select value={p.category} onChange={e => setPrizes(prizes.map(x => x.id === p.id ? { ...x, category: e.target.value } : x))}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                <td><input type="number" min="1" value={p.qty} onChange={e => setPrizes(prizes.map(x => x.id === p.id ? { ...x, qty: parseInt(e.target.value) || 1 } : x))} style={{ width: 60 }} /></td>
                <td><input type="file" accept="image/*" onChange={e => { p._file = e.target.files[0]; if (e.target.files[0]) { const r = new FileReader(); r.onload = ev => setPrizes(prizes.map(x => x.id === p.id ? { ...x, _preview: ev.target.result } : x)); r.readAsDataURL(e.target.files[0]); } }} />{(p._preview || p.image_url) && <img src={p._preview || p.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginLeft: 8 }} />}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => remove(p)}>X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={save}>Simpan</button>
      </div>
    </div>
  );
}

function ParticipantsTab({ pid }) {
  const [cols, setCols] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState({ limit_type: 'unlimited', limit_qty: 3, unique_column: '' });
  const [msg, setMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState('');

  const fetchP = () => {
    api.getParticipants(pid, page).then(data => {
      setParticipants(data.participants.map(p => typeof p.data === 'string' ? JSON.parse(p.data) : p.data));
      setTotal(data.total);
    });
  };

  useEffect(() => {
    api.getColumns(pid).then(setCols);
    api.getParticipantSettings(pid).then(setSettings);
  }, [pid]);

  useEffect(() => { fetchP(); }, [pid, page]);

  const downloadTemplate = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/config/${pid}/participants/template?token=${encodeURIComponent(token)}`, '_blank');
  };

  const handleUpload = async () => {
    if (!importFile) { setImportError('Pilih file CSV'); return; }
    setImportError('');
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const r = await api.uploadParticipants(pid, fd);
      setMsg(r.message);
      setShowImport(false);
      setImportFile(null);
      setPage(1);
      fetchP();
    } catch (err) { setImportError(err.message); }
  };

  const saveSettings = async () => {
    try { await api.saveParticipantSettings(pid, settings); setMsg('Batasan berhasil disimpan'); }
    catch (err) { setMsg(err.message); }
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <p className="text-muted">Upload CSV. Header harus sesuai Kolom Data.</p>
        <div className="flex gap-8">
          {total > 0 && <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Hapus semua?')) { await api.deleteParticipants(pid); setParticipants([]); setTotal(0); } }}>Hapus Data</button>}
          <button className="btn btn-primary btn-sm" onClick={() => { setImportError(''); setImportFile(null); setShowImport(true); }}>Import CSV</button>
        </div>
      </div>
      {msg && <div className={`alert ${msg.includes('berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {total > 0 && (
        <div className="card mb-16">
          <div className="card-header">Batasan Hadiah & Validasi Unik <span style={{ color: '#e74c3c' }}>*</span></div>
          <div className="card-body">
            <div className="flex gap-16" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <strong>Batasan:</strong>{' '}
                {['unlimited', 'one_only', 'limited'].map(t => (
                  <label key={t} style={{ marginRight: 12, cursor: 'pointer' }}>
                    <input type="radio" checked={settings.limit_type === t} onChange={() => setSettings({ ...settings, limit_type: t })} />
                    {t === 'unlimited' ? ' Tanpa Batasan' : t === 'one_only' ? ' 1 Peserta 1 Hadiah' : ' Maksimal'}
                  </label>
                ))}
                {settings.limit_type === 'limited' && <input type="number" min="2" value={settings.limit_qty} onChange={e => setSettings({ ...settings, limit_qty: parseInt(e.target.value) || 2 })} style={{ width: 50 }} />} hadiah
              </div>
              <div>
                <strong>Kolom Unik:</strong>{' '}
                <select value={settings.unique_column} onChange={e => setSettings({ ...settings, unique_column: e.target.value })}>
                  <option value="">-- Pilih --</option>
                  {cols.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" onClick={saveSettings}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>No</th>{cols.map(c => <th key={c.id}>{c.name}</th>)}</tr></thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={i}><td>{(page - 1) * 50 + i + 1}</td>{cols.map(c => <td key={c.id}>{p[c.name] || '-'}</td>)}</tr>
              ))}
              {participants.length === 0 && <tr><td colSpan={cols.length + 1} className="text-center text-muted">Belum ada data peserta. Klik Import CSV.</td></tr>}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <div className="pagination" style={{ padding: 16 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span className="text-muted" style={{ padding: '6px 12px' }}>Halaman {page} dari {Math.ceil(total / 50)}</span>
            <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Import Peserta</h3><button className="btn btn-outline btn-sm" onClick={() => setShowImport(false)}>X</button></div>
            <div className="modal-body">
              <p className="text-muted mb-16">Upload file CSV. Header harus sesuai Tab Kolom Data. Data lama akan di-replace.</p>
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>&#8615; Download Template CSV</button>
              </div>
              <div style={{ border: '2px dashed #ddd', borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }} onClick={() => document.getElementById('csv-file-input').click()}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>&#128196;</div>
                <p style={{ fontSize: 13, color: '#888' }}>Klik untuk memilih file CSV</p>
                <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { setImportFile(e.target.files[0]); setImportError(''); }} />
              </div>
              {importFile && <div style={{ padding: '8px 12px', background: '#f5f6f8', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span><strong>{importFile.name}</strong> <span className="text-muted">({(importFile.size / 1024).toFixed(1)} KB)</span></span>
                <button className="btn btn-danger btn-sm" onClick={() => setImportFile(null)}>X</button>
              </div>}
              {importError && <div className="alert alert-error">{importError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImport(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!importFile}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogicTab({ pid }) {
  const [logics, setLogics] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [cols, setCols] = useState([]);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    logic_type: 'product', target_id: '', target_name: '', name: '', qty: 0,
    draw_method: 'manual', stop_after_seconds: 10, auto_rounds: 1,
    tiered: {}, filter_method: 'all', filter_direct_col: '', filter_direct_val: '',
    filter_cat_col: '', filter_cat_vals: [], filter_nominal_enabled: false,
    filter_nominal_col: '', filter_nominal_type: 'range', filter_nominal_lower: '', filter_nominal_upper: ''
  });

  const fetch = async () => {
    const [l, p, c] = await Promise.all([api.getLogics(pid), api.getPrizes(pid), api.getColumns(pid)]);
    setLogics(l); setPrizes(p); setCols(c);
  };
  useEffect(() => { fetch(); }, [pid]);

  const openAdd = () => { setEditId(null); setForm({ ...form, logic_type: logics[0]?.logic_type || 'product', target_id: '', target_name: '', name: '', qty: 0 }); setShowForm(true); };
  const openEdit = (l) => { setEditId(l.id); setForm({ ...l, tiered: l.tiered || {}, filter_cat_vals: l.filter_cat_vals || [] }); setShowForm(true); };

  const save = async () => {
    if (!form.name) return setMsg('Nama logic wajib diisi');
    try {
      if (editId) await api.updateLogic(pid, editId, form);
      else await api.createLogic(pid, form);
      setShowForm(false); fetch(); setMsg('Logic berhasil disimpan');
    } catch (e) { setMsg(e.message); }
  };

  const handlePrizeChange = (val) => {
    const p = prizes.find(x => x.id == val);
    setForm({ ...form, target_id: val, target_name: p?.name || '', qty: p?.qty || 0, name: p ? 'Pengundian ' + p.name : form.name });
  };
  const handleCatChange = (val) => {
    const total = prizes.filter(p => p.category === val).reduce((s, p) => s + p.qty, 0);
    setForm({ ...form, target_id: val, target_name: val, qty: total, name: 'Pengundian ' + val });
  };

  const usedCategories = [...new Set(prizes.map(p => p.category))];

  return (
    <div>
      <div className="flex-between mb-16">
        <p className="text-muted">Atur logic pengundian per produk atau per kategori.</p>
        <div className="flex gap-8">
          {logics.length > 0 && <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Hapus semua?')) { await api.deleteAllLogics(pid); fetch(); } }}>Hapus Semua</button>}
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Logic</button>
        </div>
      </div>
      {msg && <div className={`alert ${msg.includes('berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {logics.map(l => (
        <div key={l.id} className="card" style={{ marginBottom: 10, borderLeft: '4px solid #2ecc71' }}>
          <div className="card-body flex-between">
            <div>
              <strong>{l.name}</strong>
              <span className="text-muted"> | {l.logic_type === 'category' ? 'Per Kategori' : 'Per Produk'}: {l.target_name}</span>
              <span className="text-muted"> | Qty: {l.qty}</span>
              <span className="text-muted"> | {l.draw_method === 'auto' ? `Auto ${l.stop_after_seconds}s` : 'Manual'}</span>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(l)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Hapus?')) { await api.deleteLogic(pid, l.id); fetch(); } }}>Hapus</button>
            </div>
          </div>
        </div>
      ))}
      {logics.length === 0 && <div className="card"><div className="card-body text-center text-muted">Belum ada logic.</div></div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Tambah'} Logic</h3><button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>X</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label>Jenis Logic</label>
                <div className="flex gap-16">
                  <label><input type="radio" checked={form.logic_type === 'product'} onChange={() => setForm({ ...form, logic_type: 'product', target_id: '', target_name: '', qty: 0 })} disabled={!!logics[0] && logics[0].logic_type !== 'product'} /> Per Produk</label>
                  <label><input type="radio" checked={form.logic_type === 'category'} onChange={() => setForm({ ...form, logic_type: 'category', target_id: '', target_name: '', qty: 0 })} disabled={!!logics[0] && logics[0].logic_type !== 'category'} /> Per Kategori</label>
                </div>
              </div>
              {form.logic_type === 'product' ? (
                <div className="form-group"><label>Hadiah</label><select value={form.target_id} onChange={e => handlePrizeChange(e.target.value)}><option value="">-- Pilih --</option>{prizes.map(p => <option key={p.id} value={p.id} disabled={logics.some(l => l.id !== editId && l.target_id == p.id)}>{p.name} ({p.category}) {(logics.some(l => l.id !== editId && l.target_id == p.id) ? '[sudah dipakai]' : '')}</option>)}</select></div>
              ) : (
                <div className="form-group"><label>Kategori</label><select value={form.target_id} onChange={e => handleCatChange(e.target.value)}><option value="">-- Pilih --</option>{usedCategories.map(c => <option key={c} value={c} disabled={logics.some(l => l.id !== editId && l.target_name === c)}>{c} {logics.some(l => l.id !== editId && l.target_name === c) ? '[sudah dipakai]' : ''}</option>)}</select></div>
              )}
              <div className="flex gap-16">
                <div className="form-group" style={{ flex: '0 0 80px' }}><label>Qty</label><input value={form.qty} readOnly style={{ background: '#f5f6f8', textAlign: 'center', fontWeight: 700 }} /></div>
                <div className="form-group" style={{ flex: 1 }}><label>Nama Logic</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="form-group">
                <label>Metode</label>
                <div className="flex gap-16">
                  <label><input type="radio" checked={form.draw_method === 'manual'} onChange={() => setForm({ ...form, draw_method: 'manual' })} /> Manual</label>
                  <label><input type="radio" checked={form.draw_method === 'auto'} onChange={() => setForm({ ...form, draw_method: 'auto' })} /> Otomatis</label>
                </div>
              </div>
              {form.draw_method === 'auto' && (
                <div className="flex gap-16">
                  <div className="form-group"><label>Durasi (detik)</label><input type="number" value={form.stop_after_seconds} onChange={e => setForm({ ...form, stop_after_seconds: parseInt(e.target.value) || 10 })} /></div>
                  <div className="form-group"><label>Jumlah Kali Undi</label><input type="number" value={form.auto_rounds} onChange={e => setForm({ ...form, auto_rounds: parseInt(e.target.value) || 1 })} /></div>
                </div>
              )}
              <div className="card mb-16" style={{ border: '2px solid #e8e8e8' }}>
                <div className="card-header">Validasi Bertingkat</div>
                <div className="card-body">
                  <table><thead><tr><th>Kategori</th><th>Masih berkesempatan?</th></tr></thead>
                    <tbody>
                      {usedCategories.map(c => (
                        <tr key={c}><td>{c}</td><td className="text-center"><input type="checkbox" checked={form.tiered[c] !== false} onChange={e => setForm({ ...form, tiered: { ...form.tiered, [c]: e.target.checked } })} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card" style={{ border: '2px solid #e8e8e8' }}>
                <div className="card-header">Filter Peserta</div>
                <div className="card-body">
                  <div className="form-group"><select value={form.filter_method} onChange={e => setForm({ ...form, filter_method: e.target.value })}><option value="all">Semua Peserta</option><option value="direct">Dipilih Langsung</option><option value="multiple">Multiple Value</option></select></div>
                  {form.filter_method === 'direct' && (
                    <div className="alert alert-success" style={{ fontSize: 12 }}>
                      <strong>⚠ Perhatian!</strong> Peserta yang dipilih langsung akan <strong>dikecualikan dari semua pengundian hadiah lain</strong>.
                    </div>
                  )}
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

function LandingTab({ pid }) {
  const [cfg, setCfg] = useState({ title: 'LIVE DRAWING', subtitle: '', bg_color: '#1a1a2e', text_color: '#ffffff', draw_by_column: '', show_prizes: true, banner_fit: 'cover' });
  const [cols, setCols] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getLandingConfig(pid).then(data => { if (data.title) setCfg({ ...cfg, ...data }); });
    api.getColumns(pid).then(setCols);
  }, [pid]);

  const save = async () => {
    const fd = new FormData();
    Object.entries(cfg).forEach(([k, v]) => fd.append(k, v));
    if (cfg._banner) fd.append('banner', cfg._banner);
    if (cfg._logo) fd.append('logo', cfg._logo);
    if (cfg._music) fd.append('music', cfg._music);
    try { await api.saveLandingConfig(pid, fd); setMsg('Berhasil disimpan'); }
    catch (e) { setMsg(e.message); }
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <p className="text-muted">Atur tampilan landing page.</p>
        <button className="btn btn-success btn-sm" onClick={() => window.open(`/landing/${pid}`, '_blank')}>Preview Live</button>
      </div>
      {msg && <div className={`alert ${msg.includes('Berhasil') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="card">
        <div className="card-body">
          <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Judul</label><input value={cfg.title} onChange={e => setCfg({ ...cfg, title: e.target.value })} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Sub-judul</label><input value={cfg.subtitle} onChange={e => setCfg({ ...cfg, subtitle: e.target.value })} /></div>
          </div>
          <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
            <div className="form-group"><label>Warna BG</label><div className="flex gap-8"><input type="color" value={cfg.bg_color} onChange={e => setCfg({ ...cfg, bg_color: e.target.value })} style={{ width: 40, height: 38 }} /><input value={cfg.bg_color} onChange={e => setCfg({ ...cfg, bg_color: e.target.value })} style={{ width: 90 }} /></div></div>
            <div className="form-group"><label>Warna Teks</label><div className="flex gap-8"><input type="color" value={cfg.text_color} onChange={e => setCfg({ ...cfg, text_color: e.target.value })} style={{ width: 40, height: 38 }} /><input value={cfg.text_color} onChange={e => setCfg({ ...cfg, text_color: e.target.value })} style={{ width: 90 }} /></div></div>
            <div className="form-group"><label>Banner</label><input type="file" accept="image/*" onChange={e => { cfg._banner = e.target.files[0]; setCfg({ ...cfg }); }} /></div>
            <div className="form-group"><label>Logo</label><input type="file" accept="image/*" onChange={e => { cfg._logo = e.target.files[0]; setCfg({ ...cfg }); }} /></div>
          </div>
          <div className="flex gap-16" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group"><label>Pengundian By</label><select value={cfg.draw_by_column} onChange={e => setCfg({ ...cfg, draw_by_column: e.target.value })}><option value="">-- Pilih --</option>{cols.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div className="form-group"><label>Tampilan Banner</label><select value={cfg.banner_fit} onChange={e => setCfg({ ...cfg, banner_fit: e.target.value })}><option value="cover">Fit to Width</option><option value="contain">Original</option><option value="fill">Stretch</option></select></div>
            <div className="form-group"><label>Tampilkan Hadiah</label><input type="checkbox" checked={cfg.show_prizes} onChange={e => setCfg({ ...cfg, show_prizes: e.target.checked })} /></div>
            <div className="form-group"><label>Music</label><input type="file" accept="audio/*" onChange={e => { cfg._music = e.target.files[0]; setCfg({ ...cfg }); }} /></div>
          </div>
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={save}>Simpan</button>
      </div>
    </div>
  );
}
