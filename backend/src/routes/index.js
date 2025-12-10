import express from 'express';
import taskRouter from './task.route.js';  // Fixed import
import authRouter from './auth.route.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
    });
});

// API routes
router.use('/auth', authRouter);
router.use('/tasks', taskRouter);

export default router;