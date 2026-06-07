import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

// Initialize the mailer transporter
export const initMailer = async () => {
  // If using an HTTP-based mail service API key, we skip SMTP transporter creation
  if (process.env.RESEND_API_KEY) {
    console.log('📬 Configured Resend API key found. Initializing Resend HTTP mailer...');
    return;
  }
  if (process.env.SENDGRID_API_KEY) {
    console.log('📬 Configured SendGrid API key found. Initializing SendGrid HTTP mailer...');
    return;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    console.log('📬 Configured SMTP credentials found. Initializing SMTP mailer...');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    });
  } else {
    console.log('⚠️ No SMTP config found. Creating Nodemailer Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`✅ Ethereal Mail Account created:`);
      console.log(`   - User: ${testAccount.user}`);
      console.log(`   - Host: smtp.ethereal.email`);
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } catch (err) {
      console.error('❌ Failed to create Ethereal test account. Falling back to console logging.', err.message);
      // Fallback logger
      transporter = {
        sendMail: async (options) => {
          console.log('\n=======================================');
          console.log('[MOCKED EMAIL SENT]');
          console.log(`TO:      ${options.to}`);
          console.log(`SUBJECT: ${options.subject}`);
          console.log('CONTENT:');
          console.log(options.html.replace(/<[^>]*>/g, ' '));
          console.log('=======================================\n');
          return { messageId: 'mock-msg-' + Math.random().toString(36).substring(7) };
        }
      };
    }
  }
};

/**
 * Sends an email using Resend HTTP API.
 */
const sendResendEmail = async ({ to, subject, html }) => {
  const from = process.env.SMTP_FROM || 'onboarding@resend.dev';
  console.log(`✉️ Sending email via Resend HTTP API to ${to}...`);
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Resend API Error: ${response.statusText || response.status}`);
  }
  console.log(`✅ Email sent successfully via Resend API. ID: ${data.id}`);
  return { success: true, messageId: data.id };
};

/**
 * Sends an email using SendGrid HTTP API.
 */
const sendSendGridEmail = async ({ to, subject, html }) => {
  let fromEmail = 'no-reply@rechargesystem.com';
  const fromEnv = process.env.SMTP_FROM || '"Recharge Admin" <no-reply@rechargesystem.com>';
  const match = fromEnv.match(/<([^>]+)>/);
  if (match && match[1]) {
    fromEmail = match[1];
  } else if (fromEnv.includes('@')) {
    fromEmail = fromEnv.trim();
  }

  console.log(`✉️ Sending email via SendGrid HTTP API to ${to} (from ${fromEmail})...`);

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject: subject,
      content: [{ type: 'text/html', value: html }]
    })
  });

  if (!response.ok) {
    let errorMsg = `SendGrid API Error: ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData && errData.errors) {
        errorMsg = `SendGrid API Error: ${JSON.stringify(errData.errors)}`;
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }

  console.log(`✅ Email sent successfully via SendGrid API.`);
  const msgId = response.headers.get('x-message-id') || 'sendgrid-msg-' + Math.random().toString(36).substring(7);
  return { success: true, messageId: msgId };
};

/**
 * Sends an email using the initialized transporter or HTTP APIs.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - Email HTML body
 */
export const sendEmail = async ({ to, subject, html }) => {
  // 1. Try Resend HTTP API if configured
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendResendEmail({ to, subject, html });
    } catch (error) {
      console.error('❌ Resend API sending error:', error.message);
      throw error;
    }
  }

  // 2. Try SendGrid HTTP API if configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      return await sendSendGridEmail({ to, subject, html });
    } catch (error) {
      console.error('❌ SendGrid API sending error:', error.message);
      throw error;
    }
  }

  // 3. Try SMTP or Ethereal transporter
  if (!transporter) {
    await initMailer();
  }

  if (!transporter) {
    throw new Error('Mailer transporter not initialized and no HTTP API keys found.');
  }

  const from = process.env.SMTP_FROM || '"Recharge System" <no-reply@rechargesystem.com>';
  
  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const result = { success: true, messageId: info.messageId };
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Email Preview URL: ${previewUrl}`);
      result.previewUrl = previewUrl;
    }
    return result;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw error;
  }
};
