import { validationResult } from 'express-validator';
import { logger } from '../config/logger.js';

export const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        
        if (errors.isEmpty()) {
            return next();
        }

        // Format errors
        const formattedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            location: err.location
        }));

        logger.warn('Validation failed', {
            url: req.originalUrl,
            method: req.method,
            errors: formattedErrors,
        });

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors
        });
    };
};