import { Schema, model, type InferSchemaType } from 'mongoose';

const TransactionSchema = new Schema({
  player: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  finalBid: { type: Number, required: true, min: 0 },
  auction: { type: Schema.Types.ObjectId, ref: 'Auction', default: null },
  auctioneer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  soldAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

export type ITransaction = InferSchemaType<typeof TransactionSchema>;
export default model<ITransaction>('Transaction', TransactionSchema);
