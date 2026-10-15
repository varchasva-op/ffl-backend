import mongoose, { type ClientSession } from 'mongoose';
import Auction from '../models/Auction';
import Player from '../models/Player';
import Team from '../models/Team';
import Transaction from '../models/Transaction';
import type { UserRole } from '../models/User';
import { HttpError } from './httpError';

export const AUCTION_KEY = 'ffl-main-auction';
export const ALLOWED_BIDS = [50000, 100000, 250000, 500000] as const;
type BidIdentity = { userId: string; role: UserRole };

async function ensureAuction(session?: ClientSession) {
  const options = session ? { session } : {};
  await Auction.updateOne({ key: AUCTION_KEY }, { $setOnInsert: { key: AUCTION_KEY } }, { upsert: true, ...options });
  return Auction.findOne({ key: AUCTION_KEY }, null, options);
}

export async function getAuctionSnapshot() {
  await ensureAuction();
  return Auction.findOne({ key: AUCTION_KEY })
    .populate('activePlayer')
    .populate('leadingTeam', 'name code crest remainingPurse')
    .populate('bidHistory.team', 'name code crest')
    .populate('bidHistory.bidder', 'name')
    .populate('lastSale')
    .lean();
}

export async function startAuction(playerId: string, adminId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const auction = await ensureAuction(session);
      if (!auction) throw new HttpError(500, 'Could not initialize the auction.');
      if (['active', 'final-call'].includes(auction.status)) throw new HttpError(409, 'End the current lot before starting another.');
      const player = await Player.findById(playerId).session(session);
      if (!player) throw new HttpError(404, 'Player not found.');
      if (player.auctionStatus !== 'unsold') throw new HttpError(409, 'Only an unsold player can be placed on the block.');
      player.auctionStatus = 'active';
      await player.save({ session });
      auction.status = 'active';
      auction.activePlayer = player._id;
      auction.startingPrice = player.basePrice;
      auction.currentBid = player.basePrice;
      auction.leadingTeam = null;
      auction.set('bidHistory', []);
      auction.startedBy = new mongoose.Types.ObjectId(adminId);
      auction.startedAt = new Date();
      auction.finalCallAt = null;
      auction.endedAt = null;
      auction.lastSale = null;
      auction.version += 1;
      await auction.save({ session });
    });
  } finally { await session.endSession(); }
  return getAuctionSnapshot();
}

export async function placeBid(teamId: string, increment: number, identity: BidIdentity) {
  if (!ALLOWED_BIDS.includes(increment as typeof ALLOWED_BIDS[number])) throw new HttpError(400, 'Choose a valid bid increment.');
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const auction = await Auction.findOne({ key: AUCTION_KEY }).lean();
    if (!auction || !['active', 'final-call'].includes(auction.status) || !auction.activePlayer) throw new HttpError(409, 'There is no active lot to bid on.');
    const [team, player] = await Promise.all([Team.findById(teamId).lean(), Player.findById(auction.activePlayer).lean()]);
    if (!team) throw new HttpError(404, 'Team not found.');
    if (!player || player.auctionStatus !== 'active') throw new HttpError(409, 'This player is no longer available to bid on.');
    if (team.owner && identity.role !== 'admin' && String(team.owner) !== identity.userId) throw new HttpError(403, 'Only the team owner or an admin can bid for this team.');
    if ((team.roster?.length || 0) >= 11) throw new HttpError(409, 'This team already has 11 players.');
    const amount = Number(auction.currentBid) + increment;
    if (amount > Number(team.remainingPurse)) throw new HttpError(409, 'This raise exceeds the team’s remaining purse.');
    const updated = await Auction.findOneAndUpdate(
      { _id: auction._id, version: auction.version, status: { $in: ['active', 'final-call'] } },
      { $set: { currentBid: amount, leadingTeam: team._id }, $push: { bidHistory: { team: team._id, bidder: new mongoose.Types.ObjectId(identity.userId), amount, increment, createdAt: new Date() } }, $inc: { version: 1 } },
      { new: true },
    );
    if (updated) return getAuctionSnapshot();
  }
  throw new HttpError(409, 'Another bid landed at the same time. Refresh the auction and try again.');
}

export async function setFinalCall(adminId: string) {
  const auction = await Auction.findOne({ key: AUCTION_KEY });
  if (!auction || !['active', 'final-call'].includes(auction.status)) throw new HttpError(409, 'There is no open lot to call.');
  auction.status = 'final-call';
  auction.finalCallAt = new Date();
  auction.startedBy = auction.startedBy || new mongoose.Types.ObjectId(adminId);
  auction.version += 1;
  await auction.save();
  return getAuctionSnapshot();
}

export async function finalizeAuction(adminId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const auction = await Auction.findOne({ key: AUCTION_KEY }).session(session);
      if (!auction || !['active', 'final-call'].includes(auction.status) || !auction.activePlayer) throw new HttpError(409, 'There is no open lot to end.');
      const player = await Player.findById(auction.activePlayer).session(session);
      if (!player) throw new HttpError(404, 'Active player not found.');
      if (auction.leadingTeam) {
        const team = await Team.findById(auction.leadingTeam).session(session);
        if (!team) throw new HttpError(409, 'The leading team no longer exists.');
        if (team.remainingPurse < auction.currentBid) throw new HttpError(409, 'The winning team no longer has enough funds.');
        if (team.roster.length >= 11) throw new HttpError(409, 'The winning team roster is full.');
        team.remainingPurse -= auction.currentBid;
        team.roster.push(player._id);
        await team.save({ session });
        player.auctionStatus = 'sold';
        player.team = team._id;
        player.soldPrice = auction.currentBid;
        player.soldAt = new Date();
        await player.save({ session });
        const [sale] = await Transaction.create([{ player: player._id, team: team._id, finalBid: auction.currentBid, auction: auction._id, auctioneer: new mongoose.Types.ObjectId(adminId) }], { session });
        auction.lastSale = sale._id;
      } else {
        player.auctionStatus = 'unsold';
        player.team = null;
        await player.save({ session });
      }
      auction.status = 'closed';
      auction.endedAt = new Date();
      auction.version += 1;
      await auction.save({ session });
    });
  } finally { await session.endSession(); }
  return getAuctionSnapshot();
}

export async function markPlayerUnsold(adminId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const auction = await Auction.findOne({ key: AUCTION_KEY }).session(session);
      if (!auction || !['active', 'final-call'].includes(auction.status) || !auction.activePlayer) throw new HttpError(409, 'There is no open lot to mark unsold.');
      await Player.findByIdAndUpdate(auction.activePlayer, { auctionStatus: 'unsold', team: null }, { session });
      auction.leadingTeam = null;
      auction.status = 'closed';
      auction.endedAt = new Date();
      auction.version += 1;
      await auction.save({ session });
    });
  } finally { await session.endSession(); }
  return getAuctionSnapshot();
}
