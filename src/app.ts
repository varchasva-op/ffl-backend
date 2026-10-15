import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import playerRoutes from './routes/player.routes';
import teamRoutes from './routes/team.routes';
import auctionRoutes from './routes/auction.routes';
import uploadRoutes from './routes/upload.routes';
import transactionRoutes from './routes/transactions.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const origins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} is not allowed by CORS. Add it to FRONTEND_URL.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'ffl-backend', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
