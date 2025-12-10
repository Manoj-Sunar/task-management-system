import jwt from "jsonwebtoken";



import { catchAsync } from "./error-handler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { logger } from "../config/logger.js";
import { User } from "../models/user.js";



export const protect = catchAsync(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        logger.warn('No token provided', { url: req.originalUrl, ip: req.ip });
        return res.status(401).json(
            new ApiResponse(401, false, 'Not authorized, no token')
        );
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.id).select('-password -refreshToken');

        if (!user) {
            logger.warn('User not found for token', { userId: decoded.id });
            return res.status(401).json(
                new ApiResponse(401, false, 'User not found')
            );
        }

        if (!user.isActive) {
            logger.warn('Inactive user tried to access', { userId: user._id });
            return res.status(401).json(
                new ApiResponse(401, false, 'User account is deactivated')
            );
        }

        // Check if token was issued before last password change
        if (user.changedPasswordAfter(decoded.iat)) {
            logger.warn('Token issued before password change', { userId: user._id });
            return res.status(401).json(
                new ApiResponse(401, false, 'User recently changed password. Please log in again.')
            );
        }

        // Attach user to request
        req.user = user;
        logger.debug('User authenticated', { userId: user._id, role: user.role });

        next();
    } catch (error) {
        logger.error('Token verification failed', {
            error: error.message,
            name: error.name
        });

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(
                new ApiResponse(401, false, 'Invalid token')
            );
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(
                new ApiResponse(401, false, 'Token expired')
            );
        }

        return res.status(401).json(
            new ApiResponse(401, false, 'Not authorized, token failed')
        );
    }
});

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json(
                new ApiResponse(401, false, 'Not authenticated')
            );
        }

        if (!roles.includes(req.user.role)) {
            logger.warn('Unauthorized access attempt', {
                userId: req.user._id,
                role: req.user.role,
                requiredRoles: roles,
                url: req.originalUrl
            });
            return res.status(403).json(
                new ApiResponse(403, false, 'Not authorized to access this route')
            );
        }

        logger.debug('Role authorized', {
            userId: req.user._id,
            role: req.user.role,
        });

        next();
    };
};

export const optionalAuth = catchAsync(async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password -refreshToken');

            if (user && user.isActive) {
                req.user = user;
                logger.debug('Optional auth: User authenticated', { userId: user._id });
            }
        } catch (error) {
            // Token is invalid but we don't throw error for optional auth
            logger.debug('Optional auth: Invalid token', { error: error.message });
        }
    }

    next();
});

// Generate JWT token
export const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
};