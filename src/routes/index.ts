import { Router } from 'express';
import userRoutes from './userRoutes';
import aiRoutes from './aiRoutes';
import preferenceRoutes from './preferenceRoutes';
import logRoutes from './logRoutes';
import gameRoutes from './gameRoutes';

const router = Router();

// API routes
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/user/preferences', preferenceRoutes);
router.use('/logs', logRoutes);
router.use('/game', gameRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

export default router;
