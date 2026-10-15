import mongoose from 'mongoose';

/** Connect once per long-lived Node process. Keep this module server-only. */
export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Add it to backend/.env or your host environment.');

  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState === 1) return mongoose;

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || undefined,
    maxPoolSize: 12,
    serverSelectionTimeoutMS: 12_000,
  });
  console.info(`MongoDB connected${process.env.MONGODB_DB ? ` · ${process.env.MONGODB_DB}` : ''}`);
  return mongoose;
}
