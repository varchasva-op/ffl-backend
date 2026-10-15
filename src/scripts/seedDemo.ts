import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { ensureDemoLeague } from '../services/seed.service';

async function run(){await connectDatabase();await ensureDemoLeague();await mongoose.disconnect();console.info('FFL demo players, teams, and opening auction are seeded.')}
run().catch(async error=>{console.error(error);await mongoose.disconnect();process.exit(1)});
