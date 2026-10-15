import { Schema, model, type InferSchemaType } from 'mongoose';

export const PLAYER_POSITIONS = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB', 'GK'] as const;
export type PlayerPosition = typeof PLAYER_POSITIONS[number];

const AttributesSchema = new Schema({
  pace: { type: Number, min: 40, max: 99, default: 75 },
  shooting: { type: Number, min: 40, max: 99, default: 70 },
  passing: { type: Number, min: 40, max: 99, default: 70 },
  dribbling: { type: Number, min: 40, max: 99, default: 70 },
  defending: { type: Number, min: 40, max: 99, default: 60 },
  physical: { type: Number, min: 40, max: 99, default: 70 },
}, { _id: false });

const PlayerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true, index: true },
  seedKey: { type: String, unique: true, sparse: true, select: false },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  jerseyName: { type: String, required: true, trim: true, maxlength: 20 },
  jerseyNumber: { type: Number, required: true, min: 1, max: 99 },
  age: { type: Number, required: true, min: 12, max: 75 },
  primaryPosition: { type: String, enum: PLAYER_POSITIONS, required: true },
  secondaryPosition: { type: String, enum: [...PLAYER_POSITIONS, ''], default: '' },
  preferredFoot: { type: String, enum: ['Left', 'Right', 'Both'], default: 'Right' },
  playstyle: { type: String, default: 'Box-to-Box Engine', maxlength: 50 },
  attributes: { type: AttributesSchema, default: () => ({}) },
  overall: { type: Number, min: 40, max: 99, default: 75 },
  basePrice: { type: Number, min: 100000, max: 2000000, default: 100000 },
  photoUrl: { type: String, default: '', maxlength: 2048 },
  imageKitFileId: { type: String, default: '' },
  auctionStatus: { type: String, enum: ['unsold', 'active', 'sold'], default: 'unsold', index: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
  soldPrice: { type: Number, default: null },
  soldAt: { type: Date, default: null },
  countryCode: { type: String, default: 'FFL', maxlength: 4 },
}, { timestamps: true });

PlayerSchema.index({ name: 'text', jerseyName: 'text', playstyle: 'text' });
export type IPlayer = InferSchemaType<typeof PlayerSchema>;
export default model<IPlayer>('Player', PlayerSchema);
