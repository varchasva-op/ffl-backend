import multer from 'multer';
import { HttpError } from '../services/httpError';

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export const playerPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!acceptedTypes.has(file.mimetype)) {
      callback(new HttpError(400, 'Upload a JPG, PNG, WebP, or AVIF image.'));
      return;
    }
    callback(null, true);
  },
});
