import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">&#127922;</div>
          <div className="brand-text">CMS Pengundian<span>Jatis Mobile</span></div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/projects">&#128194; Daftar Proyek</NavLink>
          <NavLink to="/reporting">&#128202; Reporting</NavLink>
          <NavLink to="/users">&#128101; User Management</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div>{user.name || 'Admin'}</div>
          <button onClick={handleLogout}>&#8592; Keluar</button>
        </div>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
