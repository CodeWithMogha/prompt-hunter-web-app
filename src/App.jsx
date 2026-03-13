import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, UserCircle, ShieldCheck } from 'lucide-react';
import HomeView from './components/HomeView';
import CameraView from './components/CameraView';
import ProfileView from './components/ProfileView';
import WelcomeView from './components/WelcomeView';
import AdminPortalView from './components/AdminPortalView';
import './index.css';

const NAV = [
  { path: '/',        Icon: Home,       label: 'Home'    },
  { path: '/hunt',    Icon: Camera,     label: 'Hunt'    },
  { path: '/profile', Icon: UserCircle, label: 'Profile' },
  { path: '/admin',   Icon: ShieldCheck,label: 'Admin'   },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-container">
      <div className="content-area">
        <Routes>
          <Route path="/"        element={<HomeView />}    />
          <Route path="/hunt"    element={<CameraView />}  />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/welcome" element={<WelcomeView />} />
          <Route path="/admin"   element={<AdminPortalView />} />
        </Routes>
      </div>

      {location.pathname !== '/welcome' && (
        <nav className="bottom-nav">
          {/* eslint-disable-next-line no-unused-vars */}
          {NAV.map(({ path, Icon, label }) => {
            const active = location.pathname === path;
            return (
              <div
                key={path}
                id={`nav-${label.toLowerCase()}`}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(path)}
                role="button"
                aria-label={label}
              >
                <div className="nav-icon-wrap">
                  <Icon size={21} />
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export default App;
