import { Schema, model, type InferSchemaType } from 'mongoose';

export type UserRole = 'admin' | 'player';

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'player'], default: 'player', required: true, index: true },
  playerProfile: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

export type IUser = InferSchemaType<typeof UserSchema>;
export default model<IUser>('User', UserSchema);
