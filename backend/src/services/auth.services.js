import jwt from "jsonwebtoken";
import { StatusCodes } from 'http-status-codes';
import { User } from '../models/user.js';
import { AppError } from '../middlewares/error-handler.js';
import { generateToken } from '../middlewares/auth.js';
import { logger } from '../config/logger.js';
import cache from '../config/cache.js';



export class AuthService {
    async register(userData) {
        const { name, email, password, role = 'user' } = userData;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email already in use', StatusCodes.BAD_REQUEST);
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password,
            role,
        });

        // Generate token
        const token = generateToken(user._id);

        // Cache user data
        await cache.set(`user:${user._id}`, user.toAuthJSON(), 3600);

        logger.info(`New user registered: ${user.email}`, {
            userId: user._id,
            role: user.role
        });

        return {
            user: user.toAuthJSON(),
            token,
        };
    }





    async login(email, password) {
        // Find user with password
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            throw new AppError('Incorrect email or password', StatusCodes.UNAUTHORIZED);
        }

        if (!user.isActive) {
            throw new AppError('Account is deactivated', StatusCodes.UNAUTHORIZED);
        }

        // Update last login
        await user.updateLastLogin();

        // Generate token
        const token = generateToken(user._id);

        // Cache user data
        await cache.set(`user:${user._id}`, user.toAuthJSON(), 3600);

        logger.info(`User logged in: ${user.email}`, {
            userId: user._id,
            role: user.role
        });

        return {
            user: user.toAuthJSON(),
            token,
        };
    }



    async logout(token) {
        if (!token) return;

        try {
            // Add token to blacklist
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
                if (expiresIn > 0) {
                    await cache.set(`blacklist:${token}`, 'true', expiresIn);
                }
            }

            logger.info('User logged out');
        } catch (error) {
            logger.error('Logout error:', error);
        }
    }




    async getCurrentUser(userId) {
        // Try to get from cache first
        const cachedUser = await cache.get(`user:${userId}`);
        if (cachedUser) {
            logger.debug('User cache hit', { userId });
            return cachedUser;
        }

        // Get from database
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', StatusCodes.NOT_FOUND);
        }

        const userData = user.toAuthJSON();

        // Cache user data
        await cache.set(`user:${userId}`, userData, 3600);

        return userData;
    }





    async updateProfile(userId, updateData) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', StatusCodes.NOT_FOUND);
        }

        // Check if email is being changed and if it's already taken
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await User.findOne({ email: updateData.email });
            if (existingUser) {
                throw new AppError('Email already in use', StatusCodes.BAD_REQUEST);
            }
        }

        // Update user
        Object.assign(user, updateData);
        await user.save();

        // Clear cache
        await cache.del(`user:${userId}`);

        logger.info(`User profile updated: ${user.email}`, {
            userId,
            updatedFields: Object.keys(updateData)
        });

        return user.toAuthJSON();
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new AppError('User not found', StatusCodes.NOT_FOUND);
        }

        // Check current password
        if (!(await user.comparePassword(currentPassword))) {
            throw new AppError('Current password is incorrect', StatusCodes.UNAUTHORIZED);
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Clear cache
        await cache.del(`user:${userId}`);

        logger.info(`Password changed for user: ${user.email}`, { userId });

        return true;
    }





    async checkTokenBlacklist(token) {
        if (!token) return true;

        const isBlacklisted = await cache.get(`blacklist:${token}`);
        return !!isBlacklisted;
    }
}

