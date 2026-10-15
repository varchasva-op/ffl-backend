import type { RequestHandler } from 'express';
import Player from '../models/Player';
import { HttpError } from '../services/httpError';
import { uploadPlayerPhoto } from '../services/imagekit.service';

export const uploadMyPlayerPhoto: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'Choose an image file to upload.');
    const player = await Player.findOne({ user: req.authUser?.id });
    if (!player) throw new HttpError(404, 'Player profile not found.');
    const uploaded = await uploadPlayerPhoto(req.file.buffer, req.file.originalname, req.file.mimetype);
    player.photoUrl = uploaded.url;
    player.imageKitFileId = uploaded.fileId;
    await player.save();
    const io = req.app.get('io');
    if (io) io.emit('players:state', await Player.find().populate('user', 'name').populate('team', 'name code crest').sort({ overall: -1 }).lean());
    const populatedPlayer = await Player.findById(player._id).populate('team', 'name code crest').populate('user', 'name');
    res.json({ photoUrl: uploaded.url, fileId: uploaded.fileId, player: populatedPlayer });
  } catch (error) { next(error); }
};
