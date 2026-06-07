import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

// Initialize the mailer transporter
export const initMailer = async () => {
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
 * Sends an email using the initialized transporter.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - Email HTML body
 */
export const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    await initMailer();
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
    
    // Ethereal helper to get preview url
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
