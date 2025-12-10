import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import morgan from "morgan";
import mongoose from "mongoose";
import responseTime from 'response-time';

import { logger } from "./src/config/logger.js";
import { connectDB } from "./src/config/database.js";
import { errorHandler } from "./src/middlewares/error-handler.js";
import router from "./src/routes/index.js";
import cache from "./src/config/cache.js";

// Get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validate required environment variables

const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
// Instead of checking only production, check based on Redis usage
if (process.env.REDIS_URL) {
    requiredEnvVars.push('REDIS_URL');
}

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        logger.error(`Missing required environment variable: ${envVar}`);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
}

const PORT = process.env.PORT || 3000;
const app = express();


// Add after compression middleware
app.use(responseTime((req, res, time) => {
    if (time > 1000) { // Log slow requests > 1s
        logger.warn(`Slow request detected: ${req.method} ${req.url} took ${time.toFixed(2)}ms`);
    }
}));

// Create necessary directories
const logsDir = path.join(__dirname, 'logs');
const uploadsDir = path.join(__dirname, 'uploads');

[logsDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
    origin: process.env.SECURITY_CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting with different settings for production
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15') * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1' // Skip localhost in development
});

app.use('/api/', limiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: process.env.UPLOAD_MAX_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.UPLOAD_MAX_SIZE || '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        { flags: 'a' }
    );

    app.use(morgan('combined', {
        stream: accessLogStream,
        skip: (req) => req.url === '/api/v1/health'
    }));
}

// Console logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// API routes
app.use(`/api/${process.env.API_VERSION || 'v1'}`, router);

// 404 handler for API routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Error handler (MUST be after routes)
app.use(errorHandler);

// Graceful shutdown handlers
const gracefulShutdown = async () => {
    logger.info('Starting graceful shutdown...');

    try {
        // Close HTTP server
        if (server) {
            server.close(async () => {
                logger.info('HTTP server closed.');

                // Close database connection
                if (mongoose.connection.readyState === 1) {
                    await mongoose.connection.close(false);
                    logger.info('MongoDB connection closed.');
                }

                // Close Redis connection
                if (cache && cache.disconnect) {
                    await cache.disconnect();
                    logger.info('Redis connection closed.');
                }

                logger.info('Graceful shutdown completed.');
                process.exit(0);
            });

            // Force close after 10 seconds
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        } else {
            process.exit(0);
        }
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Give time to log the error before exiting
    setTimeout(() => process.exit(1), 1000);
});

let server;

const startServer = async () => {
    try {
        // ----------------------------------------------
        // 1. Use in-memory MongoDB in test environment
        // ----------------------------------------------
        if (process.env.USE_MONGODB_MEMORY === 'true' && process.env.NODE_ENV === 'test') {
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            const mongoServer = await MongoMemoryServer.create();
            process.env.MONGODB_URI = mongoServer.getUri();
            logger.info('🧪 Using in-memory MongoDB for testing');
        }

        // ----------------------------------------------
        // 2. Database connection with retry logic
        // ----------------------------------------------
        const maxAttempts = 5;

        const tryConnectDB = async () => {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await connectDB();
                    logger.info('🗄️ Database connected successfully');
                    return true;
                } catch (error) {
                    logger.warn(`Database connection attempt ${attempt} failed: ${error.message}`);

                    if (attempt === maxAttempts) {
                        throw new Error('❌ Max DB connection attempts reached');
                    }

                    // wait before retry
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        };

        await tryConnectDB();

        // ----------------------------------------------
        // 3. Connect to cache
        // ----------------------------------------------
        try {
            await cache.connect();
            logger.info('🗃️ Cache connected successfully');
        } catch (error) {
            logger.warn(`⚠️ Cache connection failed, continuing without cache: ${error.message}`);
        }

        // ----------------------------------------------
        // 4. Start the server
        // ----------------------------------------------
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
            logger.info(`📍 Listening on port ${PORT}`);
            logger.info(`🗄️ Database: Connected`);
            logger.info(`🗃️ Cache: ${cache.isConnected ? 'Connected' : 'Not Connected'}`);
        });

        // ----------------------------------------------
        // 5. Server error handling
        // ----------------------------------------------
        server.on('error', (error) => {
            if (error.syscall !== 'listen') throw error;

            switch (error.code) {
                case 'EACCES':
                    logger.error(`${PORT} requires elevated privileges`);
                    process.exit(1);
                case 'EADDRINUSE':
                    logger.error(`${PORT} is already in use`);
                    process.exit(1);
                default:
                    throw error;
            }
        });

        // ----------------------------------------------
        // 6. Health Check Endpoint
        // ----------------------------------------------
        app.get('/health', (req, res) => {
            const health = {
                status: 'UP',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
                cache: cache.isConnected ? 'UP' : 'DOWN',
                memory: process.memoryUsage()
            };

            res.status(
                mongoose.connection.readyState === 1 ? 200 : 503
            ).json(health);
        });

    } catch (error) {
        logger.error(`❌ Failed to start server: ${error.message}`);
        process.exit(1);
    }
};


if (process.env.NODE_ENV !== "test") {
    startServer();
}