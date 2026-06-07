import { useState, useEffect } from 'react';
import { CreditCard, Calendar, Clock, Check, HelpCircle, Activity } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const PLANS = [
  { id: 'Basic', name: 'Basic Plan', price: 99, features: ['Standard Support', 'Single Device Access', 'SD Streaming'] },
  { id: 'Standard', name: 'Standard Plan', price: 249, features: ['24/7 Chat Support', '2 Devices Access', 'HD Streaming', 'No Ads'] },
  { id: 'Premium', name: 'Premium Plan', price: 799, features: ['Priority Support', '4 Devices Access', 'Ultra HD / 4K Streaming', 'Offline Downloads', 'Family Sharing'] }
];

const DURATIONS = [
  { label: 'Monthly (30 Days)', days: 30, discount: 0 },
  { label: 'Quarterly (90 Days)', days: 90, discount: 0.1 }, // 10% off
  { label: 'Annually (365 Days)', days: 365, discount: 0.2 }  // 20% off
];

export default function Dashboard({ token }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('Standard');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch subscription details
  const fetchSubscription = async () => {
    try {
      const response = await fetch(`${API_BASE}/subscription`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  // Compute pricing
  const basePrice = PLANS.find(p => p.id === selectedPlan)?.price || 0;
  const durationObj = DURATIONS.find(d => d.days === selectedDuration);
  const durationMultiplier = selectedDuration === 30 ? 1 : selectedDuration === 90 ? 3 : 12;
  const rawPrice = basePrice * durationMultiplier;
  const discountAmount = rawPrice * (durationObj?.discount || 0);
  const finalPrice = Math.round(rawPrice - discountAmount);

  // Handle Recharge Submit (Simulation)
  const handleRecharge = async () => {
    setSimulatingPayment(true);
    setError('');
    
    // Simulate gateway delay (2 seconds)
    setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/recharge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_name: selectedPlan,
            duration_days: selectedDuration
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Recharge transaction failed');
        }

        setPaymentSuccess(true);
        // Refresh subscription info
        await fetchSubscription();

        // Close success screen after 3 seconds
        setTimeout(() => {
          setPaymentSuccess(false);
        }, 3000);

      } catch (err) {
        setError(err.message || 'Payment simulation failed. Check backend connection.');
      } finally {
        setSimulatingPayment(false);
      }
    }, 2000);
  };

  const getStatusBadge = (status, days) => {
    if (status !== 'active') {
      return <span className="badge badge-danger">Expired</span>;
    }
    if (days <= 3) {
      return <span className="badge badge-warning">Expiring Soon</span>;
    }
    return <span className="badge badge-success">Active</span>;
  };

  const calculateProgress = (days) => {
    if (!subscription) return 0;
    const maxDays = selectedDuration; // fallback
    return Math.min(100, Math.max(0, (days / 30) * 100)); // simple percentage representation
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }} />
        <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Loading account status...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* 1. SUBSCRIPTION OVERVIEW SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Subscription Status</h2>
        
        {subscription ? (
          <div className="glass-panel" style={styles.subCard}>
            <div style={styles.cardHeader}>
              <div>
                <span style={styles.subPlanLabel}>CURRENT SUBSCRIPTION</span>
                <h3 style={styles.subPlanName}>{subscription.plan_name} Plan</h3>
              </div>
              <div>
                {getStatusBadge(subscription.status, subscription.days_remaining)}
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.statLabelIcon}>
                  <Calendar size={16} />
                  <span>Start Date</span>
                </div>
                <div style={styles.statValue}>
                  {new Date(subscription.start_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statLabelIcon}>
                  <Clock size={16} />
                  <span>Expiry Date</span>
                </div>
                <div style={styles.statValue}>
                  {new Date(subscription.expiry_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statLabelIcon}>
                  <Activity size={16} />
                  <span>Days Remaining</span>
                </div>
                <div style={styles.statValue}>
                  {subscription.status === 'active' ? `${subscription.days_remaining} Days` : '0 Days'}
                </div>
              </div>
            </div>

            {subscription.status === 'active' && (
              <div style={styles.progressContainer}>
                <div style={styles.progressBarWrapper}>
                  <div 
                    style={{ 
                      ...styles.progressBar, 
                      width: `${Math.min(100, Math.max(5, (subscription.days_remaining / 30) * 100))}%`,
                      backgroundColor: subscription.days_remaining <= 3 ? 'var(--warning)' : 'var(--primary)'
                    }} 
                  />
                </div>
                <span style={styles.progressText}>
                  {subscription.days_remaining} of 30 days remaining in current cycle
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={styles.noSubCard}>
            <HelpCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3 style={{ marginBottom: '8px' }}>No Active Subscription</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Please select a plan below to activate your subscription.
            </p>
          </div>
        )}
      </section>

      {/* 2. RECHARGE FORM SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Recharge & Upgrade</h2>
        
        {paymentSuccess ? (
          <div className="glass-panel animate-fade-in" style={styles.paymentSuccessCard}>
            <div style={styles.successIconWrapper}>
              <Check size={36} color="white" />
            </div>
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Recharge Completed!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Your payment of ₹{finalPrice} was simulated successfully. A confirmation email has been dispatched.
            </p>
          </div>
        ) : (
          <div className="glass-panel" style={styles.rechargeCard}>
            {error && (
              <div style={{ ...styles.alertDanger, marginBottom: '20px' }}>
                {error}
              </div>
            )}
            
            <div style={styles.formSplit}>
              {/* Plan Cards Grid */}
              <div style={styles.formSplitLeft}>
                <label style={styles.fieldLabel}>1. Select Subscription Plan</label>
                <div style={styles.plansGrid}>
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      style={{
                        ...styles.planItemCard,
                        borderColor: selectedPlan === plan.id ? 'var(--primary)' : 'var(--card-border)',
                        background: selectedPlan === plan.id ? 'rgba(37, 99, 235, 0.05)' : 'rgba(255, 255, 255, 0.01)'
                      }}
                    >
                      <div style={styles.planItemHeader}>
                        <h4 style={styles.planItemName}>{plan.name}</h4>
                        <div style={styles.planItemPrice}>₹{plan.price}<span style={styles.pricePeriod}>/mo</span></div>
                      </div>
                      <ul style={styles.featuresList}>
                        {plan.features.map((feat, index) => (
                          <li key={index} style={styles.featureItem}>
                            <Check size={12} color="var(--success)" style={{ flexShrink: 0 }} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration & Payment Panel */}
              <div style={styles.formSplitRight}>
                <div className="form-group" style={{ marginBottom: '25px' }}>
                  <label htmlFor="duration">2. Choose Duration</label>
                  <select
                    id="duration"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(parseInt(e.target.value, 10))}
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                  >
                    {DURATIONS.map((dur) => (
                      <option key={dur.days} value={dur.days}>
                        {dur.label} {dur.discount > 0 ? `(-${dur.discount * 100}% Discount)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.priceSummaryCard}>
                  <div style={styles.summaryRow}>
                    <span>Plan Price</span>
                    <span>₹{rawPrice}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ ...styles.summaryRow, color: 'var(--success)' }}>
                      <span>Discount ({durationObj.discount * 100}%)</span>
                      <span>-₹{Math.round(discountAmount)}</span>
                    </div>
                  )}
                  <div style={styles.summaryDivider} />
                  <div style={styles.summaryTotalRow}>
                    <span>Total Amount</span>
                    <span style={{ color: 'var(--primary)', fontSize: '20px', fontWeight: '800' }}>₹{finalPrice}</span>
                  </div>
                </div>

                <button
                  onClick={handleRecharge}
                  disabled={simulatingPayment}
                  className="btn btn-primary"
                  style={styles.payBtn}
                >
                  <CreditCard size={18} />
                  {simulatingPayment ? 'Simulating Payment Gateways...' : 'Simulate Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
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
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '18px',
    borderLeft: '4px solid var(--primary)',
    paddingLeft: '12px',
  },
  subCard: {
    padding: '30px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '25px',
  },
  subPlanLabel: {
    fontSize: '11px',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    fontWeight: '700',
  },
  subPlanName: {
    fontSize: '24px',
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statBox: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    padding: '16px',
  },
  statLabelIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-muted)',
    fontSize: '13px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: '10px',
  },
  progressBarWrapper: {
    height: '6px',
    backgroundColor: '#1e293b',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '9999px',
    transition: 'width 0.4s ease',
  },
  progressText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  noSubCard: {
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  rechargeCard: {
    padding: '30px',
  },
  formSplit: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
  },
  formSplitLeft: {
    flex: '1.4',
    minWidth: '300px',
  },
  formSplitRight: {
    flex: '1',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '15px',
  },
  plansGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  planItemCard: {
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  planItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  planItemName: {
    fontSize: '15px',
    fontWeight: '700',
  },
  planItemPrice: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--text-main)',
  },
  pricePeriod: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '400',
  },
  featuresList: {
    listStyleType: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 16px',
    marginTop: '6px',
  },
  featureItem: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  priceSummaryCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '10px',
    color: 'var(--text-muted)',
  },
  summaryDivider: {
    height: '1px',
    backgroundColor: 'var(--card-border)',
    margin: '12px 0',
  },
  summaryTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '15px',
    fontWeight: '700',
  },
  payBtn: {
    width: '100%',
    padding: '14px 20px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    width: '100%',
  },
  paymentSuccessCard: {
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successIconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--success)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
  },
  alertDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#f87171',
    fontSize: '14px',
  }
};
