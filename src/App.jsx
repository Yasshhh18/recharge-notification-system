import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NotificationHistory from './components/NotificationHistory';
import AdminDashboard from './components/AdminDashboard';
import { CreditCard, History, Shield, LogOut, User } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load user data on startup if token exists
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  if (!token || !user) {
    return (
      <div className="app-container" style={styles.authLayout}>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* GLOBAL GLASS HEADER NAVBAR */}
      <header className="glass-panel" style={styles.header}>
        <div style={styles.navContainer}>
          <div style={styles.logoGroup}>
            <div style={styles.logoIcon}>⚡</div>
            <h1 style={styles.logoText}>
              <span className="gradient-text">Recharge System</span>
            </h1>
          </div>

          <nav style={styles.navLinks}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{ ...styles.navBtn, ...(activeTab === 'dashboard' ? styles.navBtnActive : {}) }}
            >
              <CreditCard size={16} />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              style={{ ...styles.navBtn, ...(activeTab === 'notifications' ? styles.navBtnActive : {}) }}
            >
              <History size={16} />
              Notifications
            </button>

            {user.is_admin && (
              <button
                onClick={() => setActiveTab('admin')}
                style={{ ...styles.navBtn, ...(activeTab === 'admin' ? styles.navBtnActive : {}) }}
              >
                <Shield size={16} />
                Admin Panel
              </button>
            )}
          </nav>

          <div style={styles.profileGroup}>
            <div style={styles.profileInfo}>
              <div style={styles.profileIconBox}>
                <User size={14} color="var(--primary)" />
              </div>
              <div style={styles.profileText}>
                <span style={styles.userName}>{user.name}</span>
                <span style={styles.userRole}>
                  {user.is_admin ? 'Administrator' : 'Customer Account'}
                </span>
              </div>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC COMPONENT PANEL */}
      <main style={styles.mainContent}>
        {activeTab === 'dashboard' && <Dashboard token={token} />}
        {activeTab === 'notifications' && <NotificationHistory token={token} />}
        {activeTab === 'admin' && user.is_admin && <AdminDashboard token={token} />}
      </main>

      <footer style={styles.footer}>
        <div>
          <span>API Status: </span>
          <span className="pulse-dot" style={{ verticalAlign: 'middle' }} />
          <span style={{ marginLeft: '6px', color: '#10b981', fontWeight: '700' }}>ONLINE</span>
        </div>
        <div>
          Recharge Notification System &copy; 2026. Made with ❤️
        </div>
      </footer>
    </div>
  );
}

const styles = {
  authLayout: {
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
  },
  header: {
    margin: '20px auto 10px auto',
    width: '95%',
    maxWidth: '1200px',
    borderRadius: '12px',
    padding: '12px 24px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '20px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '800',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navBtn: {
    fontFamily: 'inherit',
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  navBtnActive: {
    backgroundColor: '#1e293b',
    color: 'var(--text-main)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  profileGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  profileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingRight: '16px',
    borderRight: '1px solid var(--card-border)',
  },
  profileIconBox: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
    lineHeight: '1.2',
  },
  userRole: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  footer: {
    padding: '20px 40px',
    borderTop: '1px solid var(--card-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-muted)',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: 'auto',
  }
};
