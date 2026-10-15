import { Schema, model, type InferSchemaType } from 'mongoose';

const BidSchema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  bidder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  increment: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const AuctionSchema = new Schema({
  key: { type: String, default: 'ffl-main-auction', unique: true, index: true },
  status: { type: String, enum: ['idle', 'active', 'final-call', 'closed'], default: 'idle', index: true },
  activePlayer: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
  startingPrice: { type: Number, default: 0 },
  currentBid: { type: Number, default: 0 },
  leadingTeam: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
  bidHistory: { type: [BidSchema], default: [] },
  version: { type: Number, default: 0 },
  startedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  startedAt: { type: Date, default: null },
  finalCallAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  lastSale: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { timestamps: true });

export type IAuction = InferSchemaType<typeof AuctionSchema>;
export default model<IAuction>('Auction', AuctionSchema);
