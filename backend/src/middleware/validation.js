import { validationResult } from 'express-validator';
import { addCorsHeaders } from './cors.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    addCorsHeaders(req, res);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  next();
};
