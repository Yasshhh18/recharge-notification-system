import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'recharge_notification_system';

// Connection pool configuration
const dbConfig = {
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create the connection pool (connections will be opened lazily)
const pool = mysql.createPool(dbConfig);

// Helper to test the connection, auto-create database & auto-create tables
export const checkConnection = async () => {
  let initConnection = null;
  let poolConnection = null;
  try {
    console.log(`🔌 Connecting to MySQL server on ${dbHost}:${dbPort}...`);
    
    // 1. Establish connection to MySQL server without database first
    initConnection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    // 2. Create the database if it does not exist
    await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await initConnection.end();
    console.log(`✅ Database "${dbName}" verified/created successfully.`);

    // 3. Test the connection pool and run table creation queries
    poolConnection = await pool.getConnection();
    
    // 4. Create Tables
    console.log('🏗️  Verifying database tables...');
    
    // Users Table
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        google_id VARCHAR(255) UNIQUE NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run schema migrations for existing database tables
    try {
      await poolConnection.query(`ALTER TABLE users MODIFY password VARCHAR(255) NULL`);
    } catch (err) {
      console.warn('⚠️ Users table migration warning (password):', err.message);
    }
    try {
      await poolConnection.query(`ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE NULL`);
    } catch (err) {
      if (err.errno !== 1060) { // 1060 is "Duplicate column name", which is normal if it exists
        console.warn('⚠️ Users table migration warning (google_id):', err.message);
      }
    }

    // Subscriptions Table
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        status ENUM('active', 'expired') DEFAULT 'active',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Email Logs Table
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        email VARCHAR(150) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('sent', 'failed') NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ All database tables verified/created successfully.');
    poolConnection.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message || error);
    if (initConnection && initConnection.connection?.state !== 'disconnected') {
      try { await initConnection.end(); } catch (e) {}
    }
    if (poolConnection) {
      poolConnection.release();
    }
    return false;
  }
};

export default pool;
