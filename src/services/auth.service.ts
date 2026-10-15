import bcrypt from 'bcryptjs';
import User from '../models/User';

export async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set; no bootstrap admin was created.');
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) return;
  await User.create({ name: 'FFL Auction Admin', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  console.info(`Bootstrap admin created for ${email}`);
}
