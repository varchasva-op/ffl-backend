import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/User';

type TokenPayload = { sub: string; email: string; role: UserRole; playerId?: string };

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    res.status(401).json({ message: 'Sign in to continue.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (!decoded.sub || !decoded.role) {
      res.status(401).json({ message: 'Invalid access token.' });
      return;
    }
    req.authUser = { id: decoded.sub, email: decoded.email, role: decoded.role, playerId: decoded.playerId };
    next();
  } catch {
    res.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.authUser) {
      res.status(401).json({ message: 'Sign in to continue.' });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ message: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}
