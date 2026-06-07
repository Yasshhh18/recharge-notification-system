import eventEmitter from '../utils/eventEmitter.js';
import { sendEmail } from '../utils/mailer.js';
import pool from '../config/db.js';

// Helper to log emails in the database
const logEmail = async (userId, email, subject, status) => {
  try {
    const query = 'INSERT INTO email_logs (user_id, email, subject, status) VALUES (?, ?, ?, ?)';
    await pool.query(query, [userId, email, subject, status]);
    console.log(`📝 Email log saved in DB for ${email} (Status: ${status})`);
  } catch (error) {
    console.error('❌ Failed to log email in database:', error.message);
  }
};

// HTML Email Layout Generator
const generateEmailHTML = (subject, name, bodyContent) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #cbd5e1;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.7;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #94a3b8;
    }
    .content p strong {
      color: #f1f5f9;
    }
    .card {
      background-color: #1f2937;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
    }
    .card-item {
      margin-bottom: 12px;
      font-size: 15px;
    }
    .card-item:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #64748b;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 2px;
    }
    .value {
      color: #f8fafc;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      background-color: #0f172a;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #1f2937;
      font-size: 13px;
      color: #475569;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    .footer p {
      margin: 5px 0 0 0;
    }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin-top: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Recharge System</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        ${bodyContent}
      </div>
      <div class="footer">
        <p>This is an automated system notification.</p>
        <p>&copy; 2026 Recharge Notification System. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// 1. Recharge Successful Event Listener
eventEmitter.on('rechargeSuccessful', async (data) => {
  const { userId, name, email, planName, expiryDate } = data;
  const subject = 'Recharge Successful';
  
  console.log(`🔔 Event 'rechargeSuccessful' received for User: ${name} (${email})`);

  const bodyContent = `
    <p>Your recharge has been completed successfully.</p>
    <div class="card">
      <div class="card-item">
        <span class="label">Subscription Plan</span>
        <span class="value">${planName}</span>
      </div>
      <div class="card-item">
        <span class="label">Expiry Date</span>
        <span class="value">${expiryDate}</span>
      </div>
    </div>
    <p>Thank you for choosing our service. Your features are now unlocked.</p>
  `;

  const html = generateEmailHTML(subject, name, bodyContent);
  let status = 'sent';

  try {
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error(`❌ Failed to send recharge confirmation email to ${email}:`, error.message);
    status = 'failed';
  } finally {
    await logEmail(userId, email, subject, status);
  }
});

// 2. Subscription Expiring Event Listener
eventEmitter.on('subscriptionExpiring', async (data) => {
  const { userId, name, email, planName, daysRemaining, expiryDate } = data;
  const subject = 'Subscription Expiring Soon';

  console.log(`🔔 Event 'subscriptionExpiring' received for User: ${name} (${email})`);

  const bodyContent = `
    <p>Your subscription will expire in <strong>${daysRemaining} days</strong> (on ${expiryDate}).</p>
    <div class="card">
      <div class="card-item">
        <span class="label">Plan Name</span>
        <span class="value">${planName}</span>
      </div>
      <div class="card-item">
        <span class="label">Expiry Date</span>
        <span class="value">${expiryDate}</span>
      </div>
    </div>
    <p>Please renew your plan to prevent any interruptions to your service.</p>
    <a href="http://localhost:5173/" class="btn">Recharge Now</a>
  `;

  const html = generateEmailHTML(subject, name, bodyContent);
  let status = 'sent';

  try {
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error(`❌ Failed to send expiry reminder email to ${email}:`, error.message);
    status = 'failed';
  } finally {
    await logEmail(userId, email, subject, status);
  }
});

// 3. Subscription Expired Event Listener
eventEmitter.on('subscriptionExpired', async (data) => {
  const { userId, name, email, planName } = data;
  const subject = 'Subscription Expired';

  console.log(`🔔 Event 'subscriptionExpired' received for User: ${name} (${email})`);

  const bodyContent = `
    <p>Your subscription has expired.</p>
    <div class="card">
      <div class="card-item">
        <span class="label">Expired Plan</span>
        <span class="value">${planName}</span>
      </div>
      <div class="card-item">
        <span class="label">Status</span>
        <span class="value" style="color: #ef4444;">EXPIRED</span>
      </div>
    </div>
    <p>Please recharge to continue using services.</p>
    <a href="http://localhost:5173/" class="btn">Recharge Now</a>
  `;

  const html = generateEmailHTML(subject, name, bodyContent);
  let status = 'sent';

  try {
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error(`❌ Failed to send subscription expired email to ${email}:`, error.message);
    status = 'failed';
  } finally {
    await logEmail(userId, email, subject, status);
  }
});

console.log('✅ Email Event Listeners registered.');
export default eventEmitter;
