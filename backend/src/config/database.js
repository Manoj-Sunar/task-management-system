import mongoose from "mongoose";
import { logger } from "./logger.js";


export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected successfully');
    } catch (error) {
        logger.error('Error disconnecting MongoDB:', error);
    }
};