import './utils/loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware, auth } from './middleware/index.js';
import logger from './utils/logger.js';
import stripeWebhookHandler from './routes/stripe-webhook.js';

const app = express();

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
  logger.info('Interrupted');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  await new Promise(resolve => setTimeout(resolve, 3000));
  logger.info('Exiting');
  process.exit();
});

app.use(helmet());

// Configure CORS to allow Authorization header
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(morgan('combined'));

// Register Stripe webhook BEFORE express.json() using express.raw()
logger.info('[MAIN] Registering Stripe webhook handler');
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// Configure body parser for JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply authentication middleware BEFORE routes are mounted
logger.info('[MAIN] Registering auth middleware BEFORE routes');
app.use(auth);

// Mount routes AFTER auth middleware
logger.info('[MAIN] Mounting routes');
app.use('/', routes());

app.use(errorMiddleware);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  logger.info(`🚀 API Server running on http://localhost:${port}`);
});

export default app;
