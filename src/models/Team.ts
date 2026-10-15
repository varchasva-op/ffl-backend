import { Schema, model, type InferSchemaType } from 'mongoose';

const TeamSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, match: /^[A-Z0-9]{3}$/ },
  captainName: { type: String, required: true, trim: true, maxlength: 80 },
  owner: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  crest: {
    shape: { type: String, enum: ['shield', 'round', 'classic'], default: 'shield' },
    icon: { type: String, default: '⚽', maxlength: 8 },
    primaryColor: { type: String, default: '#00ff87', match: /^#[0-9a-fA-F]{6}$/ },
    secondaryColor: { type: String, default: '#10231b', match: /^#[0-9a-fA-F]{6}$/ },
  },
  auctionPurse: { type: Number, default: 10000000, min: 0 },
  remainingPurse: { type: Number, default: 10000000, min: 0 },
  roster: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
}, { timestamps: true });

export type ITeam = InferSchemaType<typeof TeamSchema>;
export default model<ITeam>('Team', TeamSchema);
