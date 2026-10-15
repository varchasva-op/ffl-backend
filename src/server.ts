import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app';
import { connectDatabase } from './config/db';
import { bootstrapAdmin } from './services/auth.service';
import { getAuctionSnapshot } from './services/auction.service';
import { registerAuctionSockets } from './socket';
import { ensureDemoLeague } from './services/seed.service';

async function start(): Promise<void> {
  await connectDatabase();
  await bootstrapAdmin();
  await ensureDemoLeague();
  await getAuctionSnapshot();

  const server = createServer(app);
  const origins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origins.includes(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS.`));
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });
  app.set('io', io);
  registerAuctionSockets(io);

  const port = Number(process.env.PORT || 4000);
  server.listen(port, '0.0.0.0', () => console.info(`FFL API + Socket.IO listening on :${port}`));

  const shutdown = (signal: string) => {
    console.info(`${signal} received; closing FFL server…`);
    io.close(() => server.close(() => process.exit(0)));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start FFL backend:', error);
  process.exit(1);
});
