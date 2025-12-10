import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../middlewares/error-handler.js';


const taskSchema = Joi.object({
    title: Joi.string().min(3).max(200).required().messages({
        'string.min': 'Title must be at least 3 characters',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
    }),
    description: Joi.string().max(2000).allow('').messages({
        'string.max': 'Description cannot exceed 2000 characters'
    }),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done').default('todo').messages({
        'any.only': 'Status must be one of: todo, in_progress, review, done'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium').messages({
        'any.only': 'Priority must be one of: low, medium, high, critical'
    }),
    dueDate: Joi.date().greater('now').messages({
        'date.greater': 'Due date must be in the future'
    }),
    assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'Assigned user is required'
    }),
    tags: Joi.array().items(Joi.string().max(20)).messages({
        'string.max': 'Tag cannot exceed 20 characters'
    }),
    estimatedHours: Joi.number().min(0).max(1000).messages({
        'number.min': 'Estimated hours must be at least 0',
        'number.max': 'Estimated hours cannot exceed 1000'
    }),
    actualHours: Joi.number().min(0).messages({
        'number.min': 'Actual hours must be at least 0'
    }),
});

const updateTaskSchema = taskSchema.fork(
    ['title', 'assignedTo'],
    (schema) => schema.optional()
);

const taskQuerySchema = Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done'),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    createdBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    tags: Joi.string(),
    search: Joi.string(),
    sortBy: Joi.string().valid('createdAt', 'dueDate', 'priority', 'status', 'title'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
});

const commentSchema = Joi.object({
    text: Joi.string().min(1).max(1000).required().messages({
        'string.min': 'Comment cannot be empty',
        'string.max': 'Comment cannot exceed 1000 characters',
        'any.required': 'Comment text is required'
    }),
});

export const validateTask = (data) => {
   
    const { error } = taskSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};

export const validateUpdateTask = (data) => {
    const { error } = updateTaskSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};

export const validateTaskQuery = (data) => {
    const { error } = taskQuerySchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};

export const validateComment = (data) => {
    const { error } = commentSchema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, errors);
    }
};