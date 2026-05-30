import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LiveDrawing from './pages/LiveDrawing';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing/:urlPath" element={<LiveDrawing />} />
      </Routes>
    </BrowserRouter>
  );
}
