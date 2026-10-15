import { Router } from 'express';
import Transaction from '../models/Transaction';

const router=Router();
router.get('/',async(_req,res,next)=>{try{const transactions=await Transaction.find().populate('player','name jerseyName primaryPosition overall photoUrl').populate('team','name code crest').sort({soldAt:-1}).limit(30).lean();res.json({transactions})}catch(error){next(error)}});
export default router;
