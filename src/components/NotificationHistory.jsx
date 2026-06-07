import { useState, useEffect } from 'react';
import { Mail, Clock, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function NotificationHistory({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'sent') {
      return (
        <span className="badge badge-success" style={{ gap: '4px' }}>
          <CheckCircle size={12} />
          Sent
        </span>
      );
    }
    return (
      <span className="badge badge-danger" style={{ gap: '4px' }}>
        <ShieldAlert size={12} />
        Failed
      </span>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }} />
        <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Retrieving notification logs...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.sectionTitle}>Notification History</h2>
          <p style={styles.subtitle}>
            A verification audit of all transaction, reminder, and status alert emails dispatched to your account.
          </p>
        </div>
        <button 
          onClick={() => fetchNotifications(true)} 
          disabled={refreshing} 
          className="btn btn-secondary"
          style={styles.refreshBtn}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-panel" style={styles.emptyCard}>
          <Mail size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3>No Notifications Dispatched</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            When emails are sent regarding your subscription, their logs will populate here.
          </p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table>
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Recipient Email</th>
                <th>Subject Line</th>
                <th>Delivery Time</th>
                <th>Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    #{String(log.id).padStart(5, '0')}
                  </td>
                  <td>{log.email}</td>
                  <td style={{ fontWeight: '600' }}>{log.subject}</td>
                  <td>
                    <div style={styles.dateCell}>
                      <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>
                        {new Date(log.sent_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td>{getStatusBadge(log.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '30px 20px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  titleArea: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: '20px',
    borderLeft: '4px solid var(--primary)',
    paddingLeft: '12px',
    marginBottom: '4px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  refreshBtn: {
    padding: '10px 16px',
    fontSize: '13px',
  },
  emptyCard: {
    padding: '50px 30px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    width: '100%',
  }
};
