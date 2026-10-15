import type { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Player, { PLAYER_POSITIONS, type PlayerPosition } from '../models/Player';
import { HttpError } from '../services/httpError';

const cleanUser = (user: { _id: unknown; name: string; email: string; role: string; playerProfile?: unknown }) => {
  const profile = user.playerProfile as { _id?: unknown } | null | undefined;
  const playerId = profile && typeof profile === 'object' && profile._id ? String(profile._id) : profile ? String(profile) : undefined;
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, playerId };
};

function signToken(user: { _id: unknown; email: string; role: string; playerProfile?: unknown }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  const payload = { sub: String(user._id), email: user.email, role: user.role, playerId: user.playerProfile ? String(user.playerProfile) : undefined };
  return jwt.sign(payload, secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '1000d') as jwt.SignOptions['expiresIn'] });
}

export const registerPlayer: RequestHandler = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const jerseyName = String(req.body.jerseyName || name).trim().slice(0, 20);
    const jerseyNumber = Number(req.body.jerseyNumber || 10);
    const age = Number(req.body.age || 20);
    const primaryPosition = String(req.body.primaryPosition || 'ST') as PlayerPosition;
    const secondaryPosition = String(req.body.secondaryPosition || '') as PlayerPosition | '';
    const basePrice = Number(req.body.basePrice || 100000);

    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      throw new HttpError(400, 'Enter a name, valid email, and password with at least 8 characters.');
    }
    if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99 || !Number.isInteger(age) || age < 12 || age > 75) {
      throw new HttpError(400, 'Jersey number must be 1–99 and age must be 12–75.');
    }
    if (!PLAYER_POSITIONS.includes(primaryPosition) || (secondaryPosition && !PLAYER_POSITIONS.includes(secondaryPosition))) {
      throw new HttpError(400, 'Choose a valid playing position.');
    }
    if (!Number.isFinite(basePrice) || basePrice < 100000 || basePrice > 2000000) {
      throw new HttpError(400, 'Base price must be between $100,000 and $2,000,000.');
    }
    if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists.');

    const attributes = {
      pace: Number(req.body.pace) || 75,
      shooting: Number(req.body.shooting) || 70,
      passing: Number(req.body.passing) || 70,
      dribbling: Number(req.body.dribbling) || 70,
      defending: Number(req.body.defending) || 60,
      physical: Number(req.body.physical) || 70,
    };
    const overall = Math.round(Object.values(attributes).reduce((sum, value) => sum + value, 0) / 6);
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'player' });
    const player = await Player.create({
      user: user._id, name, jerseyName, jerseyNumber, age, primaryPosition, secondaryPosition,
      preferredFoot: ['Left', 'Right', 'Both'].includes(req.body.preferredFoot) ? req.body.preferredFoot : 'Right',
      playstyle: String(req.body.playstyle || 'Box-to-Box Engine').slice(0, 50), attributes, overall, basePrice,
    });
    user.playerProfile = player._id;
    await user.save();
    const populatedUser = { ...user.toObject(), playerProfile: player._id };
    const io = req.app.get('io');
    if (io) io.emit('players:state', await Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean());
    res.status(201).json({ token: signToken(populatedUser), user: cleanUser(populatedUser), player });
  } catch (error) { next(error); }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.');
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signToken(user), user: cleanUser(user) });
  } catch (error) { next(error); }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUser?.id).populate('playerProfile');
    if (!user || !user.isActive) throw new HttpError(401, 'Account not found or disabled.');
    res.json({ user: cleanUser(user), player: user.role === 'player' ? user.playerProfile : null });
  } catch (error) { next(error); }
};

