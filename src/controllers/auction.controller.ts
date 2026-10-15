import type { RequestHandler } from 'express';
import { getAuctionSnapshot, startAuction, placeBid, setFinalCall, finalizeAuction, markPlayerUnsold } from '../services/auction.service';
import { HttpError } from '../services/httpError';
import Player from '../models/Player';
import Team from '../models/Team';
import Transaction from '../models/Transaction';

async function broadcast(req: Parameters<RequestHandler>[0], snapshot: unknown): Promise<void> {
  const io = req.app.get('io');
  if (io) io.emit('auction:state', snapshot);
}

export const currentAuction: RequestHandler = async (_req, res, next) => {
  try {
    const [auction, transactions] = await Promise.all([
      getAuctionSnapshot(),
      Transaction.find().populate('player', 'name jerseyName primaryPosition overall photoUrl').populate('team', 'name code crest').sort({ soldAt: -1 }).limit(30).lean(),
    ]);
    res.json({ auction, transactions });
  } catch (error) { next(error); }
};

export const startLot: RequestHandler = async (req, res, next) => {
  try {
    const playerId = String(req.body.playerId || '');
    if (!playerId) throw new HttpError(400, 'Choose a player to place on the block.');
    const auction = await startAuction(playerId, req.authUser!.id);
    await broadcast(req, auction);
    const io = req.app.get('io');
    if (io) io.emit('players:state', await Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean());
    res.json({ auction });
  } catch (error) { next(error); }
};

export const bid: RequestHandler = async (req, res, next) => {
  try {
    const teamId = String(req.body.teamId || '');
    const increment = Number(req.body.increment);
    if (!teamId) throw new HttpError(400, 'Choose a team to bid for.');
    const auction = await placeBid(teamId, increment, { userId: req.authUser!.id, role: req.authUser!.role });
    await broadcast(req, auction);
    res.json({ auction });
  } catch (error) { next(error); }
};

export const finalCall: RequestHandler = async (req, res, next) => {
  try {
    const auction = await setFinalCall(req.authUser!.id);
    await broadcast(req, auction);
    res.json({ auction });
  } catch (error) { next(error); }
};

export const endLot: RequestHandler = async (req, res, next) => {
  try {
    const auction = await finalizeAuction(req.authUser!.id);
    await broadcast(req, auction);
    const io = req.app.get('io');
    if (io) {
      const [players, teams, transactions] = await Promise.all([
        Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean(),
        Team.find().populate('owner', 'name').populate('roster', 'name jerseyName overall primaryPosition photoUrl').sort({ name: 1 }).lean(),
        Transaction.find().populate('player', 'name jerseyName primaryPosition overall photoUrl').populate('team', 'name code crest').sort({ soldAt: -1 }).limit(30).lean(),
      ]);
      io.emit('players:state', players);
      io.emit('teams:state', teams);
      io.emit('transactions:state', transactions);
    }
    res.json({ auction });
  } catch (error) { next(error); }
};

export const markUnsold: RequestHandler = async (req, res, next) => {
  try {
    const auction = await markPlayerUnsold(req.authUser!.id);
    await broadcast(req, auction);
    const io = req.app.get('io');
    if (io) io.emit('players:state', await Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean());
    res.json({ auction });
  } catch (error) { next(error); }
};
