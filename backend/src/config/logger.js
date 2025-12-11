import winston from "winston";
import 'winston-daily-rotate-file';

const { createLogger, format, transports } = winston;
const { combine, timestamp, errors, json, colorize, printf } = format;

// Custom format for console
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
});

export const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
    ),
    transports: [
        // Console transport
        new transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                consoleFormat
            ),
        }),

        // Daily rotate file for combined logs
        new transports.DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '20m'
        }),

        // Error log file
        new transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            maxSize: '20m'
        }),
    ],

    // Handle exceptions
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: 'logs/exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ],

    // Handle rejections
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: 'logs/rejections-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ],

    // Exit on error set to false to handle errors gracefully
    exitOnError: false
});

// Remove MongoDB transport unless explicitly needed as it can fail silently