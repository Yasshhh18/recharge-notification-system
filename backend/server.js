import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { checkConnection } from './config/db.js';
import { initMailer } from './utils/mailer.js';
import { initCronJobs } from './cron/cronJobs.js';

// Setup email listeners immediately to capture events
import './listeners/emailListener.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Dynamically allow any origin (localhost, vercel, etc.) to connect
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Root route for API verification
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Recharge & Notification System API is running'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error Handler:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// App Startup
const startServer = async () => {
  console.log('🚀 Starting Recharge Notification Server...');
  
  // 1. Verify Database Connection
  const isDbConnected = await checkConnection();
  if (!isDbConnected) {
    console.warn('⚠️ Warning: Database connection failed. Backend might fail during DB queries.');
  }

  // 2. Initialize Mailer Transporter
  await initMailer();

  // 3. Initialize Cron Jobs
  initCronJobs();

  // 4. Listen on Port
  app.listen(PORT, () => {
    console.log(`📡 Backend Server listening on http://localhost:${PORT}`);
  });
};

startServer();
