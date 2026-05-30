import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Reporting() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getReports().then(setReports).finally(() => setLoading(false)); }, []);

  const download = (id) => window.open(api.getDownloadUrl(id), '_blank');
  const remove = async (id) => { if (confirm('Hapus?')) { await api.deleteReport(id); setReports(reports.filter(r => r.id !== id)); } };

  if (loading) return <div className="text-center mt-16"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header"><h2>Reporting</h2></div>
      <div className="card">
        <table>
          <thead><tr><th>No</th><th>Proyek</th><th>Nama File</th><th>Tanggal</th><th>Aksi</th></tr></thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><strong>{r.project_name}</strong></td>
                <td>{r.file_name}</td>
                <td>{new Date(r.created_at).toLocaleString('id-ID')}</td>
                <td className="flex gap-8">
                  <button className="btn btn-success btn-sm" onClick={() => download(r.id)}>Download Excel</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Hapus</button>
                </td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={5} className="text-center text-muted">Belum ada laporan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
