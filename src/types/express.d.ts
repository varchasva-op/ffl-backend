import type { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        role: UserRole;
        playerId?: string;
      };
    }
  }
}

export {};
