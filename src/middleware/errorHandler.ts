import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : error.message });
    return;
  }
  const mongoError = (error ?? {}) as { status?: number; code?: number; name?: string };
  if (mongoError.code === 11000) {
    res.status(409).json({ message: 'A record with that unique value already exists.' });
    return;
  }
  if (mongoError.name === 'ValidationError' || mongoError.name === 'CastError') {
    res.status(400).json({ message: error instanceof Error ? error.message : 'The submitted data is invalid.' });
    return;
  }
  const status = Number(mongoError.status) || 500;
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error. Please try again.' : message });
};
