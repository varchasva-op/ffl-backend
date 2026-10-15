import type { RequestHandler } from 'express';
import Player, { PLAYER_POSITIONS, type PlayerPosition } from '../models/Player';
import User from '../models/User';
import { HttpError } from '../services/httpError';

export const listPlayers: RequestHandler = async (_req, res, next) => {
  try {
    const players = await Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1, createdAt: -1 }).lean();
    res.json({ players });
  } catch (error) { next(error); }
};

export const getPlayer: RequestHandler = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name code crest');
    if (!player) throw new HttpError(404, 'Player not found.');
    res.json({ player });
  } catch (error) { next(error); }
};

export const getMyPlayer: RequestHandler = async (req, res, next) => {
  try {
    const player = await Player.findOne({ user: req.authUser?.id }).populate('team', 'name code crest');
    if (!player) throw new HttpError(404, 'Player profile not found.');
    res.json({ player });
  } catch (error) { next(error); }
};

export const updateMyPlayer: RequestHandler = async (req, res, next) => {
  try {
    const player = await Player.findOne({ user: req.authUser?.id });
    if (!player) throw new HttpError(404, 'Player profile not found.');
    const fields = ['name', 'jerseyName', 'jerseyNumber', 'age', 'primaryPosition', 'secondaryPosition', 'preferredFoot', 'playstyle', 'basePrice'] as const;
    for (const field of fields) {
      if (req.body[field] === undefined) continue;
      if (field === 'primaryPosition' && !PLAYER_POSITIONS.includes(req.body[field] as PlayerPosition)) throw new HttpError(400, 'Choose a valid primary position.');
      if (field === 'secondaryPosition' && req.body[field] && !PLAYER_POSITIONS.includes(req.body[field] as PlayerPosition)) throw new HttpError(400, 'Choose a valid secondary position.');
      if (field === 'preferredFoot' && !['Left', 'Right', 'Both'].includes(req.body[field])) throw new HttpError(400, 'Choose a valid preferred foot.');
      if (field === 'basePrice' && (Number(req.body[field]) < 100000 || Number(req.body[field]) > 2000000)) throw new HttpError(400, 'Base price must be between $100,000 and $2,000,000.');
      (player as unknown as Record<string, unknown>)[field] = req.body[field];
    }
    if (req.body.attributes && typeof req.body.attributes === 'object') {
      const keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;
      const next: Record<string, number> = {};
      for (const key of keys) next[key] = Math.max(40, Math.min(99, Number(req.body.attributes[key]) || 40));
      player.attributes = next as typeof player.attributes;
      player.overall = Math.round(Object.values(next).reduce((sum, value) => sum + value, 0) / 6);
    }
    await player.save();
    if (req.body.name) await User.findByIdAndUpdate(req.authUser?.id, { name: String(req.body.name).trim() });
    const io = req.app.get('io');
    if (io) io.emit('players:state', await Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean());
    const populatedPlayer = await Player.findById(player._id).populate('team', 'name code crest').populate('user', 'name');
    res.json({ player: populatedPlayer });
  } catch (error) { next(error); }
};
