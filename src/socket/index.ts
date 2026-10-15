import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/User';
import { getAuctionSnapshot, placeBid } from '../services/auction.service';

interface SocketUser { id: string; email: string; role: UserRole; playerId?: string }

export function registerAuctionSockets(io: Server): void {
  io.use((socket, next) => {
    const token = String(socket.handshake.auth?.token || '');
    if (!token) return next(); // Public viewers can watch the room without signing in.
    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error('Authentication is not configured.'));
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!payload.sub || !payload.role) return next(new Error('Invalid access token.'));
      socket.data.user = { id: String(payload.sub), email: String(payload.email || ''), role: payload.role as UserRole, playerId: payload.playerId ? String(payload.playerId) : undefined } satisfies SocketUser;
      next();
    } catch {
      next(new Error('Your session expired. Please sign in again.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.join('ffl-auction-room');
    void getAuctionSnapshot().then((auction) => socket.emit('auction:state', auction)).catch((error) => console.error('Socket initial snapshot failed', error));

    socket.on('auction:bid', async (payload: { teamId?: string; increment?: number }, acknowledge?: (result: { ok: boolean; message?: string }) => void) => {
      try {
        const user = socket.data.user as SocketUser | undefined;
        if (!user) throw new Error('Sign in with a player account before placing a bid.');
        const auction = await placeBid(String(payload?.teamId || ''), Number(payload?.increment), { userId: user.id, role: user.role });
        io.to('ffl-auction-room').emit('auction:state', auction);
        acknowledge?.({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bid could not be accepted.';
        socket.emit('auction:error', { message });
        acknowledge?.({ ok: false, message });
      }
    });
  });
}
