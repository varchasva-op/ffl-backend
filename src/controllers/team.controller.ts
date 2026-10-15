import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team';
import User from '../models/User';
import Player from '../models/Player';
import Auction from '../models/Auction';
import { HttpError } from '../services/httpError';
import { getAuctionSnapshot } from '../services/auction.service';

const normalizeCrest = (value: Record<string, unknown> = {}) => ({
  shape: ['shield', 'round', 'classic'].includes(String(value.shape)) ? String(value.shape) : 'shield',
  icon: String(value.icon || '⚽').slice(0, 8),
  primaryColor: /^#[0-9a-f]{6}$/i.test(String(value.primaryColor || '')) ? String(value.primaryColor) : '#00ff87',
  secondaryColor: /^#[0-9a-f]{6}$/i.test(String(value.secondaryColor || '')) ? String(value.secondaryColor) : '#10231b',
});

async function emitTeams(req: Parameters<RequestHandler>[0]): Promise<void> {
  const io = req.app.get('io');
  if (!io) return;
  const teams = await Team.find().populate('owner', 'name').populate('roster', 'name jerseyName overall primaryPosition photoUrl').sort({ createdAt: 1 }).lean();
  io.emit('teams:state', teams);
}

export const listTeams: RequestHandler = async (_req, res, next) => {
  try {
    const teams = await Team.find().populate('owner', 'name').populate('roster', 'name jerseyName overall primaryPosition photoUrl').sort({ name: 1 }).lean();
    res.json({ teams });
  } catch (error) { next(error); }
};

export const createTeam: RequestHandler = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const code = String(req.body.code || '').trim().toUpperCase();
    const captainName = String(req.body.captainName || '').trim();
    if (name.length < 2 || captainName.length < 2 || !/^[A-Z0-9]{3}$/.test(code)) throw new HttpError(400, 'Enter a team name, captain, and unique 3-character code.');
    let owner = null;
    if (req.body.ownerId) {
      owner = await User.findOne({ _id: req.body.ownerId, role: 'player' }).select('_id');
      if (!owner) throw new HttpError(400, 'Selected team owner was not found.');
    }
    const team = await Team.create({ name, code, captainName, owner: owner?._id || null, crest: normalizeCrest(req.body.crest), auctionPurse: 10000000, remainingPurse: 10000000, roster: [] });
    await emitTeams(req);
    const populatedTeam = await Team.findById(team._id).populate('owner', 'name').populate('roster', 'name jerseyName overall primaryPosition photoUrl').lean();
    res.status(201).json({ team: populatedTeam });
  } catch (error) { next(error); }
};

export const updateTeam: RequestHandler = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new HttpError(404, 'Team not found.');
    if (req.body.name !== undefined) team.name = String(req.body.name).trim().slice(0, 50);
    if (req.body.code !== undefined) {
      const code = String(req.body.code).trim().toUpperCase();
      if (!/^[A-Z0-9]{3}$/.test(code)) throw new HttpError(400, 'Team code must be three letters or numbers.');
      team.code = code;
    }
    if (req.body.captainName !== undefined) team.captainName = String(req.body.captainName).trim().slice(0, 80);
    if (req.body.crest !== undefined) team.crest = normalizeCrest(req.body.crest) as typeof team.crest;
    if (req.body.ownerId !== undefined) {
      if (!req.body.ownerId) team.owner = null;
      else {
        const owner = await User.findOne({ _id: req.body.ownerId, role: 'player' }).select('_id');
        if (!owner) throw new HttpError(400, 'Selected team owner was not found.');
        team.owner = owner._id;
      }
    }
    await team.save();
    await emitTeams(req);
    const populatedTeam = await Team.findById(team._id).populate('owner', 'name').populate('roster', 'name jerseyName overall primaryPosition photoUrl').lean();
    res.json({ team: populatedTeam });
  } catch (error) { next(error); }
};

export const deleteTeam: RequestHandler = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let deletedName = '';
    await session.withTransaction(async () => {
      const team = await Team.findById(req.params.id).session(session);
      if (!team) throw new HttpError(404, 'Team not found.');
      deletedName = team.name;
      const auction = await Auction.findOne({ key: 'ffl-main-auction' }).session(session);
      if (auction && ['active', 'final-call'].includes(auction.status)) {
        const filteredBids = auction.bidHistory.filter((bid) => String(bid.team) !== String(team._id));
        const deletedTeamLed = String(auction.leadingTeam || '') === String(team._id);
        if (filteredBids.length !== auction.bidHistory.length || deletedTeamLed) {
          auction.set('bidHistory', filteredBids);
          const latestValidBid = filteredBids[filteredBids.length - 1];
          auction.leadingTeam = latestValidBid?.team || null;
          auction.currentBid = latestValidBid?.amount || auction.startingPrice;
          auction.version += 1;
          await auction.save({ session });
        }
      }
      await Player.updateMany({ team: team._id }, { $set: { team: null, auctionStatus: 'unsold', soldPrice: null, soldAt: null } }, { session });
      await Team.deleteOne({ _id: team._id }, { session });
    });
    const io = req.app.get('io');
    if (io) {
      const [teams, players] = await Promise.all([
        Team.find().populate('owner', 'name').populate('roster', 'name jerseyName overall primaryPosition photoUrl').lean(),
        Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean(),
      ]);
      io.emit('teams:state', teams);
      io.emit('players:state', players);
      io.emit('auction:state', await getAuctionSnapshot());
    }
    res.json({ message: `${deletedName} was deleted. Its roster is back in the unsold pool.` });
  } catch (error) { next(error); }
  finally { await session.endSession(); }
};
