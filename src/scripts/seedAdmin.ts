import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { bootstrapAdmin } from '../services/auth.service';

async function run() {
  await connectDatabase();
  await bootstrapAdmin();
  await mongoose.disconnect();
  console.info('Admin bootstrap check complete.');
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
