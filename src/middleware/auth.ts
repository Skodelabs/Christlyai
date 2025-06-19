import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

/**
 * Interface for JWT payload
 */
export interface JwtPayload {
  userId: string;
}

/**
 * Extend Express Request interface to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware to verify JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.error('No authorization header found');
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    
    if (!token) {
      console.error('No token found in authorization header');
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      
      if (!decoded || !decoded.userId) {
        console.error('Invalid token payload:', decoded);
        res.status(401).json({ status: 'error', message: 'Invalid token format' });
        return;
      }
      
      console.log('Successfully authenticated user:', decoded.userId);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ status: 'error', message: 'Authentication process failed' });
  }
};
