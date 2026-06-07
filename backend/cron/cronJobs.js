import cron from 'node-cron';
import pool from '../config/db.js';
import eventEmitter from '../utils/eventEmitter.js';

// Helper to format date into a user-friendly style
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Workflow 2: Fetch and process subscriptions expiring in <= 3 days.
 * Emits subscriptionExpiring event for matches.
 */
export const checkExpiringSubscriptions = async () => {
  console.log('⏰ Starting Expiring Subscriptions Check...');
  let connection = null;
  try {
    connection = await pool.getConnection();

    // Query active subscriptions expiring within 3 days
    const query = `
      SELECT s.id as subscription_id, s.plan_name, s.start_date, s.expiry_date, s.status,
             u.id as user_id, u.name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.expiry_date <= CURDATE() + INTERVAL 3 DAY
        AND s.expiry_date >= CURDATE()
        AND s.status = 'active'
    `;
    const [subscriptions] = await connection.query(query);
    console.log(`📋 Found ${subscriptions.length} active subscriptions expiring within 3 days.`);

    let eventEmittedCount = 0;
    for (const sub of subscriptions) {
      // Calculate remaining days
      const diffTime = new Date(sub.expiry_date) - new Date();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Avoid spamming if a warning was already sent during the current active period
      const checkLogQuery = `
        SELECT COUNT(*) as count 
        FROM email_logs 
        WHERE user_id = ? 
          AND subject = 'Subscription Expiring Soon' 
          AND sent_at >= ?
      `;
      const [[logCount]] = await connection.query(checkLogQuery, [sub.user_id, sub.start_date]);

      if (logCount.count === 0) {
        // Trigger event
        eventEmitter.emit('subscriptionExpiring', {
          userId: sub.user_id,
          name: sub.name,
          email: sub.email,
          planName: sub.plan_name,
          daysRemaining: daysRemaining,
          expiryDate: formatDate(sub.expiry_date)
        });
        eventEmittedCount++;
      } else {
        console.log(`ℹ️ Warning email already sent for user: ${sub.name} in this subscription period.`);
      }
    }
    
    console.log(`✅ Completed Expiring Subscriptions Check. Dispatched ${eventEmittedCount} warning events.`);
    return { found: subscriptions.length, processed: eventEmittedCount };
  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Workflow 3: Fetch and process active subscriptions that have expired.
 * Marks them expired in the database and emits subscriptionExpired event.
 */
export const checkExpiredSubscriptions = async () => {
  console.log('⏰ Starting Expired Subscriptions Check...');
  let connection = null;
  try {
    connection = await pool.getConnection();

    // Query active subscriptions that have passed their expiry date
    const query = `
      SELECT s.id as subscription_id, s.plan_name, s.start_date, s.expiry_date, s.status,
             u.id as user_id, u.name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.expiry_date < CURDATE()
        AND s.status = 'active'
    `;
    const [subscriptions] = await connection.query(query);
    console.log(`📋 Found ${subscriptions.length} expired active subscriptions.`);

    let expiredCount = 0;
    for (const sub of subscriptions) {
      // Use transaction to ensure status update and event emission are atomic
      await connection.beginTransaction();
      try {
        // Update subscription status in DB
        const updateQuery = `UPDATE subscriptions SET status = 'expired' WHERE id = ?`;
        await connection.query(updateQuery, [sub.subscription_id]);

        // Trigger event
        eventEmitter.emit('subscriptionExpired', {
          userId: sub.user_id,
          name: sub.name,
          email: sub.email,
          planName: sub.plan_name
        });

        await connection.commit();
        expiredCount++;
      } catch (err) {
        await connection.rollback();
        console.error(`❌ Transaction failed for sub ID ${sub.subscription_id}:`, err.message);
      }
    }
    
    console.log(`✅ Completed Expired Subscriptions Check. Updated ${expiredCount} subscriptions.`);
    return { found: subscriptions.length, processed: expiredCount };
  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Start the daily scheduler
 */
export const initCronJobs = () => {
  // Cron schedule: Runs every day at 9:00 AM (0 9 * * *)
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Daily scheduler task triggered (9:00 AM)');
    try {
      await checkExpiringSubscriptions();
      await checkExpiredSubscriptions();
    } catch (err) {
      console.error('❌ Daily cron job execution failed:', err.message);
    }
  });

  console.log('✅ Cron scheduler initialized (Runs daily at 9:00 AM).');
};
