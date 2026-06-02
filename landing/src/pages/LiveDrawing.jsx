import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';

const API = window.location.hostname === 'localhost' ? '/api' : 'https://pengundian-app-server-api.vercel.app/api';

async function fetchData(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

function maskValue(val, digits = 6) {
  const str = String(val);
  if (str.length <= digits) return str;
  return str.substring(0, str.length - digits) + '*'.repeat(digits);
}

export default function LiveDrawing() {
  const { urlPath } = useParams();
  const [data, setData] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [displayVal, setDisplayVal] = useState('########');
  const [displayMeta, setDisplayMeta] = useState({});
  const [upperWinners, setUpperWinners] = useState([]);
  const [lowerWinners, setLowerWinners] = useState([]);
  const [cumulativeWon, setCumulativeWon] = useState({});
  const [error, setError] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('ld_token');
    if (token) {
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      fetchData(`${API}/drawing/${urlPath}/data`).then(setData).catch(e => setError(e.message));
    }
  }, [urlPath, loggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      localStorage.setItem('ld_token', json.token);
      localStorage.setItem('ld_user', JSON.stringify({ name: json.name, email: json.email }));
      setLoggedIn(true);
    } catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const findLogic = (prize) => {
    if (!data?.logics) return null;
    return data.logics.find(l =>
      l.logic_type === 'product' ? l.target_id == prize.id : l.target_name === prize.category
    );
  };

  const totalWonForPrize = (prize) => {
    let count = cumulativeWon[prize.id] || 0;
    upperWinners.forEach(w => { if (w._prizeId === prize.id) count++; });
    lowerWinners.forEach(w => { if (w._prizeId === prize.id) count++; });
    return count;
  };

  const startDraw = useCallback(() => {
    if (!selectedPrize) return setError('Pilih hadiah terlebih dahulu');
    if (totalWonForPrize(selectedPrize) >= selectedPrize.qty) return setError('Kuota hadiah \"' + selectedPrize.name + '\" sudah habis. Pilih hadiah lain.');
    setError('');
    setIsDrawing(true);

    const pool = (data?.participants || []).map(p => (typeof p === 'string' ? JSON.parse(p) : p));
    // Find the actual column key (case-insensitive match)
    const drawColCfg = data?.landingConfig?.draw_by_column || 'No. Undian';
    let drawCol = drawColCfg;
    if (pool.length > 0) {
      const keys = Object.keys(pool[0]);
      const match = keys.find(k => k.toLowerCase() === drawColCfg.toLowerCase());
      if (match) drawCol = match;
      else if (keys.length > 0) drawCol = keys[0]; // fallback to first column
    }
    const logic = findLogic(selectedPrize);

    let idx = 0;
    intervalRef.current = setInterval(() => {
      if (pool.length > 0) {
        const p = pool[idx % pool.length];
        setDisplayVal(p[drawCol] || '--------');
        setDisplayMeta(p);
        idx++;
      } else {
        setDisplayVal('--------');
      }
    }, 70);

    if (logic?.draw_method === 'auto') {
      const secs = logic.stop_after_seconds || 10;
      setCountdown(secs);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); stopDraw(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  }, [selectedPrize, data]);

  const stopDraw = useCallback(async () => {
    clearInterval(intervalRef.current);
    setIsDrawing(false);
    setCountdown(0);
    if (!selectedPrize || !data) return;

    const logic = findLogic(selectedPrize);
    try {
      const result = await fetch(`${API}/drawing/${data.project_id}/draw/${logic.id}`, { method: 'POST' });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error);
      const winners = json.winners.map((w, i) => ({ ...w, _prizeId: selectedPrize.id, _hadiah: selectedPrize.name, _kategori: selectedPrize.category, _id: Date.now() + i }));
      setUpperWinners(winners);
      if (winners.length > 0) {
        setDisplayVal(winners[0][data.landingConfig?.draw_by_column || 'No. Undian'] || '--------');
        setDisplayMeta(winners[0]);
      }
    } catch (e) { setError(e.message); }
  }, [selectedPrize, data]);

  const saveToLower = () => {
    const timestamp = new Date().toLocaleString('id-ID');
    const stamped = upperWinners.map(w => ({ ...w, _timestamp: timestamp }));
    setLowerWinners([...stamped, ...lowerWinners]);
    setUpperWinners([]);
  };

  const saveToCms = async () => {
    if (!fileName.trim()) return setError('Nama file wajib diisi');
    try {
      const res = await fetch(`${API}/drawing/${data.project_id}/winners/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: fileName })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      // Add to cumulative before clearing
      const newCumulative = { ...cumulativeWon };
      lowerWinners.forEach(w => {
        newCumulative[w._prizeId] = (newCumulative[w._prizeId] || 0) + 1;
      });
      setCumulativeWon(newCumulative);
      setLowerWinners([]);
      setShowSaveModal(false);
      setFileName('');
      setError('');
    } catch (e) { setError(e.message); }
  };

  // Show login page if not authenticated
  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a3c34, #2c5e4e, #1a3c34)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '34px 32px', width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #2ecc71, #27ae60)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, color: '#fff', fontWeight: 800 }}>&#127922;</div>
            <h2 style={{ fontSize: 18, color: '#1a3c34', marginBottom: 4 }}>Live Drawing</h2>
            <p style={{ fontSize: 12, color: '#999' }}>Silakan login untuk mengakses halaman pengundian</p>
          </div>
          {authError && <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, background: '#fdecea', color: '#c0392b', marginBottom: 16 }}>{authError}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Email</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email@jatismobile.com" required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Password</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Masukkan password" required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
            <button type="submit" disabled={authLoading} style={{ width: '100%', padding: 12, background: '#1a3c34', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{authLoading ? 'Memproses...' : 'Masuk'}</button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 16 }}>Gunakan akun CMS untuk login</p>
        </div>
      </div>
    );
  }

  if (!data) return <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><div style={{ width: 30, height: 30, border: '2px solid #fff', borderTopColor: '#2ecc71', borderRadius: '50%', animation: 'spin 0.5s linear infinite' }} /></div>;

  const cfg = data.landingConfig || {};
  const cols = data.columns?.filter(c => c.show_on_web) || [];
  const drawCol = cfg.draw_by_column || 'No. Undian';

  // Auto-detect background brightness
  const hexToRgb = (hex) => {
    const h = hex.replace('#','');
    return { r: parseInt(h.substring(0,2),16), g: parseInt(h.substring(2,4),16), b: parseInt(h.substring(4,6),16) };
  };
  const getBrightness = (hex) => {
    try { const {r,g,b}=hexToRgb(hex); return (r*299+g*587+b*114)/1000; } catch(e) { return 0; }
  };
  const bgBrightness = getBrightness(cfg.bg_color || '#1a1a2e');
  const isLight = bgBrightness > 128;

  // Adaptive card styles — high contrast
  const cardBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.10)';
  const cardBorder = isLight ? '2px solid rgba(0,0,0,0.12)' : '2px solid rgba(255,255,255,0.18)';
  const cardBorderHover = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)';
  const metaBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)';
  const tagBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)';
  const tagBorder = isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.30)';
  const btnDefaultBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)';
  const btnDefaultBorder = isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.30)';
  const tableBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  return (
    <div style={{ minHeight: '100vh', background: cfg.bg_color || '#1a1a2e', color: cfg.text_color || '#fff', fontFamily: 'Segoe UI, sans-serif' }}>
      {cfg.banner_url && <div style={{ width: '100%', maxHeight: 140, overflow: 'hidden' }}><img src={cfg.banner_url} alt="" style={{ width: '100%', objectFit: cfg.banner_fit || 'cover', maxHeight: 140 }} /></div>}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {cfg.logo_url && <img src={cfg.logo_url} alt="" style={{ maxWidth: 56, maxHeight: 56, display: 'block', margin: '0 auto 8px' }} />}
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: 5, marginBottom: 2 }}>{cfg.title || 'LIVE DRAWING'}</h1>
          {cfg.subtitle && <p style={{ opacity: 0.7 }}>{cfg.subtitle}</p>}
        </div>

        {/* Prize Selector */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 10 }}>PILIH HADIAH</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {data.prizes?.map(p => {
              const won = totalWonForPrize(p);
              const exhausted = won >= p.qty;
              const remaining = p.qty - won;
              const isSelected = selectedPrize?.id === p.id;
              return (
              <button key={p.id} onClick={() => !isDrawing && !exhausted && setSelectedPrize(p)} style={{ padding: '10px 16px', borderRadius: 10, border: isSelected ? '2px solid #ffd700' : tagBorder, background: isSelected ? 'rgba(255,215,0,0.15)' : tagBg, color: 'inherit', cursor: exhausted ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, minWidth: 140, opacity: exhausted ? 0.35 : 1 }} disabled={isDrawing || exhausted}>
                {p.image_url ? <img src={p.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, opacity: exhausted ? 0.5 : 1 }} /> : <div style={{ width: 36, height: 36, borderRadius: 6, background: metaBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#127873;</div>}
                <div><div style={{ fontSize: 12 }}>{p.name}</div><div style={{ fontSize: 10, opacity: 0.7 }}>{p.category} &middot; {exhausted ? <span style={{ color: '#e74c3c' }}>Habis</span> : won > 0 ? <span style={{ color: '#2ecc71' }}>Tersisa {remaining}/{p.qty}</span> : 'Qty: ' + p.qty}</div></div>
              </button>
            )})}
          </div>
        </div>

        {/* Drawing Area */}
        <div style={{ background: cardBg, borderRadius: 16, padding: '30px 20px', textAlign: 'center', marginBottom: 20, border: cardBorder, boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          {countdown > 0 && <div style={{ width: 50, height: 50, borderRadius: '50%', border: '3px solid #ffd700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#ffd700', marginBottom: 10 }}>{countdown}</div>}
          <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{drawCol}</div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: 12, fontFamily: 'Courier New, monospace', color: upperWinners.length > 0 ? '#2ecc71' : '#ffd700', marginBottom: 8 }}>{displayVal}</div>
          {cols.length > 0 && <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            {cols.map(c => <div key={c.id} style={{ background: metaBg, borderRadius: 8, padding: '8px 14px', fontSize: 11 }}><div style={{ opacity: 0.5, marginBottom: 2 }}>{c.name}</div><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{c.masking_6digit ? maskValue(displayMeta[c.name] || '---') : (displayMeta[c.name] || '---')}</div></div>)}
          </div>}
          {error && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={startDraw} disabled={isDrawing} style={{ padding: '12px 40px', borderRadius: 10, border: 'none', background: '#2ecc71', color: '#fff', fontWeight: 700, fontSize: 15, cursor: isDrawing ? 'not-allowed' : 'pointer', opacity: isDrawing ? 0.5 : 1, textTransform: 'uppercase' }}>Start</button>
            <button onClick={stopDraw} disabled={!isDrawing} style={{ padding: '12px 40px', borderRadius: 10, border: 'none', background: '#e74c3c', color: '#fff', fontWeight: 700, fontSize: 15, cursor: !isDrawing ? 'not-allowed' : 'pointer', opacity: !isDrawing ? 0.5 : 1, textTransform: 'uppercase' }}>Stop</button>
          </div>
        </div>

        {/* Upper Table */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 16, marginBottom: 16, border: cardBorder, boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.7 }}>Pemenang Sesi Ini</h3>
            {upperWinners.length > 0 && <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setUpperWinners([])} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', cursor: 'pointer', fontSize: 11 }}>Hapus Semua</button>
              <button onClick={saveToLower} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#2ecc71', color: '#fff', cursor: 'pointer', fontSize: 11 }}>Simpan Data Pemenang</button>
            </div>}
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr><th style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>No</th><th style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>Hadiah</th>{cols.map(c => <th key={c.id} style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>{c.name}</th>)}<th style={{ padding: '6px 10px', textAlign: 'center', opacity: 0.5 }}>Aksi</th></tr></thead>
            <tbody>
              {upperWinners.map((w, i) => <tr key={w._id}><td>{i + 1}</td><td><strong>{w._hadiah}</strong></td>{cols.map(c => <td key={c.id}>{c.masking_6digit ? maskValue(w[c.name] || '-') : (w[c.name] || '-')}</td>)}<td style={{ textAlign: 'center' }}><button onClick={() => setUpperWinners(upperWinners.filter(x => x._id !== w._id))} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14 }}>&times;</button></td></tr>)}
              {upperWinners.length === 0 && <tr><td colSpan={cols.length + 3} style={{ textAlign: 'center', opacity: 0.4, padding: 20 }}>Belum ada pemenang.</td></tr>}
            </tbody>
          </table></div>
        </div>

        {/* Lower Table */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: cardBorder, boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.7 }}>Data Tersimpan</h3>
            {lowerWinners.length > 0 && <button onClick={() => setShowSaveModal(true)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#2ecc71', color: '#fff', cursor: 'pointer', fontSize: 11 }}>Simpan di CMS</button>}
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr><th style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>No</th><th style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>Hadiah</th>{cols.map(c => <th key={c.id} style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>{c.name}</th>)}<th style={{ padding: '6px 10px', textAlign: 'left', opacity: 0.5 }}>Waktu</th></tr></thead>
            <tbody>
              {lowerWinners.map((w, i) => <tr key={w._id || i}><td>{i + 1}</td><td><strong>{w._hadiah}</strong></td>{cols.map(c => <td key={c.id}>{c.masking_6digit ? maskValue(w[c.name] || '-') : (w[c.name] || '-')}</td>)}<td style={{ fontSize: 10, opacity: 0.6 }}>{w._timestamp}</td></tr>)}
              {lowerWinners.length === 0 && <tr><td colSpan={cols.length + 3} style={{ textAlign: 'center', opacity: 0.4, padding: 20 }}>Belum ada data tersimpan.</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>

      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowSaveModal(false)}>
          <div style={{ background: '#1e2d3d', borderRadius: 14, width: 380, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Simpan ke CMS</h3>
            <div style={{ marginBottom: 16 }}><label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>Nama File</label><input value={fileName} onChange={e => setFileName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14 }} placeholder="Hasil Pengundian Sesi 1" /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button onClick={() => setShowSaveModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Batal</button><button onClick={saveToCms} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2ecc71', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
