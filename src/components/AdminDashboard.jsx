import { useState, useEffect } from 'react';
import { Users, CreditCard, Clock, ShieldAlert, Mail, PlayCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function AdminDashboard({ token }) {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    expired: 0,
    emailsSent: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringExpiring, setTriggeringExpiring] = useState(false);
  const [triggeringExpired, setTriggeringExpired] = useState(false);
  const [logMessages, setLogMessages] = useState([]);

  // Fetch admin dashboard data
  const fetchData = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const [analyticsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/analytics`, { headers: authHeader }),
        fetch(`${API_BASE}/admin/users`, { headers: authHeader })
      ]);

      const analyticsData = await analyticsRes.json();
      const usersData = await usersRes.json();

      if (analyticsRes.ok && usersRes.ok) {
        setAnalytics(analyticsData.analytics);
        setUsers(usersData.users);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addLogMessage = (msg) => {
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 14) // keep last 15 logs
    ]);
  };

  // Trigger Expiring Subscriptions Cron Check
  const triggerExpiringCheck = async () => {
    setTriggeringExpiring(true);
    addLogMessage('Initiating manual check for expiring subscriptions (Cron 9:00 AM)...');
    try {
      const response = await fetch(`${API_BASE}/admin/trigger-expiring-check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        addLogMessage(`Success: ${data.message} Found: ${data.result.found}, Emailed: ${data.result.processed}`);
        fetchData();
      } else {
        addLogMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      addLogMessage(`Network failure: ${error.message}`);
    } finally {
      setTriggeringExpiring(false);
    }
  };

  // Trigger Expired Subscriptions Cron Check
  const triggerExpiredCheck = async () => {
    setTriggeringExpired(true);
    addLogMessage('Initiating manual check for expired subscriptions (Cron 12:01 AM)...');
    try {
      const response = await fetch(`${API_BASE}/admin/trigger-expired-check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        addLogMessage(`Success: ${data.message} Found: ${data.result.found}, Expired: ${data.result.processed}`);
        fetchData();
      } else {
        addLogMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      addLogMessage(`Network failure: ${error.message}`);
    } finally {
      setTriggeringExpired(false);
    }
  };

  const getSubStatusBadge = (status, expiryStr) => {
    if (!status) return <span className="badge badge-secondary">No Plan</span>;
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const cleanExpiry = new Date(expiry);
    cleanExpiry.setHours(0,0,0,0);

    if (status !== 'active') {
      return <span className="badge badge-danger">Expired</span>;
    }
    if (cleanExpiry < today) {
      return <span className="badge badge-danger">Expired (Pending Check)</span>;
    }
    
    // Check if expiring in 3 days
    const diffTime = cleanExpiry - today;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 3) {
      return <span className="badge badge-warning">Expiring Soon ({daysRemaining}d)</span>;
    }
    return <span className="badge badge-success">Active</span>;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }} />
        <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Loading administrative panel...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={styles.sectionTitle}>Admin Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Monitor system metrics, review customer accounts, and execute mock cron workflows.
        </p>
      </div>

      {/* 1. ANALYTICS GRID */}
      <div style={styles.analyticsGrid}>
        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.metricIconBox, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={20} />
          </div>
          <div>
            <span style={styles.metricLabel}>Total Users</span>
            <h3 style={styles.metricVal}>{analytics.totalUsers}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.metricIconBox, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <span style={styles.metricLabel}>Active Subscriptions</span>
            <h3 style={styles.metricVal}>{analytics.activeSubscriptions}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.metricIconBox, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={styles.metricLabel}>Expiring Soon</span>
            <h3 style={styles.metricVal}>{analytics.expiringSoon}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.metricIconBox, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <span style={styles.metricLabel}>Expired Accounts</span>
            <h3 style={styles.metricVal}>{analytics.expired}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.metricIconBox, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Mail size={20} />
          </div>
          <div>
            <span style={styles.metricLabel}>Emails Dispatched</span>
            <h3 style={styles.metricVal}>{analytics.emailsSent}</h3>
          </div>
        </div>
      </div>

      {/* 2. CRON CONTROLS PANEL */}
      <div className="glass-panel" style={styles.controlPanel}>
        <div style={styles.controlLeft}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Scheduled Task Simulator</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>
            Trigger daily billing checking engines immediately. Useful for showing bulk verification emails.
          </p>
          <div style={styles.controlButtonsGrid}>
            <button
              onClick={triggerExpiringCheck}
              disabled={triggeringExpiring}
              className="btn btn-secondary"
              style={styles.cronBtn}
            >
              {triggeringExpiring ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              Simulate Expiring Check
            </button>
            <button
              onClick={triggerExpiredCheck}
              disabled={triggeringExpired}
              className="btn btn-secondary"
              style={styles.cronBtn}
            >
              {triggeringExpired ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              Simulate Expired Check
            </button>
          </div>
        </div>
        
        <div style={styles.controlRight}>
          <h4 style={styles.logHeader}>Execution Logs Console</h4>
          <div style={styles.consoleBox}>
            {logMessages.length === 0 ? (
              <div style={styles.consolePlaceholder}>Logs will appear here when checks are run...</div>
            ) : (
              logMessages.map((log, index) => (
                <div key={index} style={styles.consoleLine}>{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. USER MANAGEMENT GRID */}
      <div>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>User & Subscription Directory</h3>
        <div className="glass-panel table-container">
          <table>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Subscribed Plan</th>
                <th>Activation Date</th>
                <th>Termination Date</th>
                <th>Account Role</th>
                <th>Timeline Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={styles.userCell}>
                      <span style={styles.userName}>{u.name}</span>
                      <span style={styles.userEmail}>{u.email}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    {u.plan_name ? `${u.plan_name} Plan` : <span style={{ color: 'var(--text-muted)' }}>None</span>}
                  </td>
                  <td>
                    {u.start_date ? new Date(u.start_date).toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td>
                    {u.expiry_date ? new Date(u.expiry_date).toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        color: u.is_admin ? 'var(--accent)' : 'var(--text-muted)' 
                      }}
                    >
                      {u.is_admin ? 'ADMIN' : 'MEMBER'}
                    </span>
                  </td>
                  <td>{getSubStatusBadge(u.sub_status, u.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  sectionTitle: {
    fontSize: '20px',
    borderLeft: '4px solid var(--primary)',
    paddingLeft: '12px',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  metricCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  metricIconBox: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '2px',
  },
  metricVal: {
    fontSize: '22px',
    fontWeight: '800',
  },
  controlPanel: {
    padding: '25px',
    display: 'flex',
    gap: '30px',
    marginBottom: '40px',
    flexWrap: 'wrap',
  },
  controlLeft: {
    flex: '1',
    minWidth: '280px',
  },
  controlButtonsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cronBtn: {
    justifyContent: 'flex-start',
    padding: '12px 18px',
    fontSize: '13px',
  },
  controlRight: {
    flex: '1.4',
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
  },
  logHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  consoleBox: {
    flex: '1',
    minHeight: '130px',
    backgroundColor: '#05070c',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    color: '#34d399',
    overflowY: 'auto',
  },
  consolePlaceholder: {
    color: '#4b5563',
    fontStyle: 'italic',
  },
  consoleLine: {
    marginBottom: '4px',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.4',
  },
  userCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontWeight: '700',
  },
  userEmail: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '250px',
    width: '100%',
  }
};
