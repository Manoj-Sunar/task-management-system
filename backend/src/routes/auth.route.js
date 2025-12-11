import express from 'express';
import { body } from 'express-validator';


import {
    changePassword,
    getMe,
    login,
    logout,
    register,
    updateProfile
} from '../controllers/auth.controller.js';  // Fixed path
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

const authRouter = express.Router();

// Public routes
authRouter.post(
    '/register',
    validate([
        body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) throw new Error('Passwords do not match');
            return true;
        }),
    ]),
    register
);


authRouter.post('/login',validate([
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
]), login);




// Protected routes
authRouter.use(protect);

authRouter.post('/logout', logout);
authRouter.get('/me', getMe);
authRouter.patch('/update-profile', [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
], validate, updateProfile);

authRouter.patch('/change-password',validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    body('confirmNewPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('New passwords do not match');
        }
        return true;
    }),
]), changePassword);

export default authRouter;