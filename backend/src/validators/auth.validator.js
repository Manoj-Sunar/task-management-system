import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../middlewares/error-handler.js';


const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Confirm password is required'
    }),
    role: Joi.string().valid('user', 'admin', 'manager').default('user').messages({
        'any.only': 'Role must be either user, admin, or manager'
    }),
}).with('password', 'confirmPassword');



const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    }),
});



const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(50).messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters'
    }),
    email: Joi.string().email().messages({
        'string.email': 'Please provide a valid email'
    }),
    profile: Joi.object({
        avatar: Joi.string().uri(),
        bio: Joi.string().max(500),
        phone: Joi.string(),
        address: Joi.object({
            street: Joi.string(),
            city: Joi.string(),
            country: Joi.string(),
            zipCode: Joi.string()
        })
    }),
    preferences: Joi.object({
        theme: Joi.string().valid('light', 'dark', 'auto'),
        notifications: Joi.object({
            email: Joi.boolean(),
            push: Joi.boolean()
        })
    })
});


const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).required().messages({
        'string.min': 'New password must be at least 8 characters',
        'any.required': 'New password is required'
    }),
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Confirm new password is required'
    }),
}).with('newPassword', 'confirmNewPassword');



export const validateRegister = (data) => {
    const { error } = registerSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};



export const validateLogin = (data) => {
    const { error } = loginSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};



export const validateUpdateProfile = (data) => {
    const { error } = updateProfileSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};



export const validateChangePassword = (data) => {
    const { error } = changePasswordSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};