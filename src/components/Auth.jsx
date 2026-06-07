import { useState, useEffect } from 'react';
import { Mail, Lock, User, ShieldAlert, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isAdmin: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize and Render Google Sign-in Button
  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        try {
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your_google_client_id_here';
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
          });

          const btnElem = document.getElementById('google-signin-btn');
          if (btnElem) {
            window.google.accounts.id.renderButton(
              btnElem,
              {
                theme: 'filled_blue',
                size: 'large',
                text: isLogin ? 'signin_with' : 'signup_with',
                shape: 'rectangular',
                width: 390
              }
            );
          }
        } catch (err) {
          console.error('Failed to initialize Google login button:', err);
        }
      }
    };

    // Load Google Button
    initGoogle();

    // Poll for script loading in case of slower connection
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google) {
        initGoogle();
        clearInterval(interval);
      } else if (attempts > 20) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isLogin]);

  // Google Authentication Callback
  const handleGoogleCredentialResponse = async (response) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const apiRes = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await apiRes.json();

      if (!apiRes.ok) {
        throw new Error(data.message || 'Google authentication failed');
      }

      setSuccess('Google Authentication successful! Redirecting...');
      setTimeout(() => {
        onAuthSuccess(data.token, data.user);
      }, 1000);
    } catch (err) {
      setError(err.message || 'Google Sign-In failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : { 
          name: formData.name, 
          email: formData.email, 
          password: formData.password,
          is_admin: formData.isAdmin 
        };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (isLogin) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 1000);
      } else {
        setSuccess('Registration successful! Please login.');
        setFormData({ name: '', email: '', password: '', isAdmin: false });
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authWrapper}>
      <div className="glass-panel animate-fade-in" style={styles.authCard}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <span className="gradient-text">Recharge System</span>
          </h2>
          <p style={styles.subtitle}>
            {isLogin ? 'Sign in to manage your subscriptions' : 'Create an account to get started'}
          </p>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{ ...styles.tab, ...(isLogin ? styles.activeTab : {}) }}
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
          >
            Sign In
          </button>
          <button
            style={{ ...styles.tab, ...(!isLogin ? styles.activeTab : {}) }}
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={styles.alertDanger}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.alertSuccess}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div style={styles.inputContainer}>
                <User size={18} style={styles.inputIcon} />
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  placeholder="Yash Patil"
                  className="input-field"
                  style={styles.inputWithIcon}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={styles.inputContainer}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="yash@gmail.com"
                className="input-field"
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={styles.inputContainer}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="••••••••"
                className="input-field"
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          {!isLogin && (
            <div style={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="isAdmin"
                name="isAdmin"
                checked={formData.isAdmin}
                onChange={handleInputChange}
                style={styles.checkbox}
              />
              <label htmlFor="isAdmin" style={styles.checkboxLabel}>
                Register as Admin User
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* GOOGLE SIGN-IN INTERFACES */}
        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or continue with</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.googleButtonWrapper}>
          <div id="google-signin-btn" style={styles.googleBtn} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  authWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    flex: 1
  },
  authCard: {
    width: '100%',
    maxWidth: '450px',
    padding: '40px 30px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  tabContainer: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    padding: '4px',
    marginBottom: '30px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    padding: '10px',
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    background: '#1e293b',
    color: 'var(--text-main)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
  },
  inputWithIcon: {
    width: '100%',
    paddingLeft: '44px',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '25px',
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  submitBtn: {
    width: '100%',
    marginTop: '10px',
  },
  alertDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#f87171',
    fontSize: '14px',
    marginBottom: '20px',
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#34d399',
    fontSize: '14px',
    marginBottom: '20px',
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    margin: '25px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--card-border)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    padding: '0 12px',
  },
  googleButtonWrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  }
};
