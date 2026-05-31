import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LiveDrawing from './pages/LiveDrawing';

function Welcome() {
  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: 5 }}>LIVE DRAWING</h1>
      <p style={{ opacity: 0.5, marginTop: 10 }}>Halaman pengundian. Akses melalui URL yang diberikan.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing/:urlPath" element={<LiveDrawing />} />
        <Route path="/" element={<Welcome />} />
        <Route path="*" element={<Welcome />} />
      </Routes>
    </BrowserRouter>
  );
}
