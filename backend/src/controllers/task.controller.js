
import { catchAsync } from '../middlewares/error-handler.js';
import taskServices from '../services/task.services.js';
import { validateComment,validateUpdateTask, validateTask, validateTaskQuery } from '../validators/task.validator.js';



export const createTask = catchAsync(async (req, res) => {
    validateTask(req.body);

    const task = await taskServices.createTask(req.body, req.user.id);

    res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: { task },
    });
});

export const getTasks = catchAsync(async (req, res) => {
    validateTaskQuery(req.query);

    const tasks = await taskServices.getTasks(req.query, req.user.id);

    res.status(200).json({
        success: true,
        data: tasks,
    });
});

export const getTask = catchAsync(async (req, res) => {
    const task = await taskServices.getTaskById(req.params.id, req.user.id);

    res.status(200).json({
        success: true,
        data: { task },
    });
});

export const updateTask = catchAsync(async (req, res) => {
    validateUpdateTask(req.body);

    const task = await taskServices.updateTask(req.params.id, req.body, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: { task },
    });
});

export const deleteTask = catchAsync(async (req, res) => {
    await taskServices.deleteTask(req.params.id, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
        data: null,
    });
});

export const addComment = catchAsync(async (req, res) => {
    validateComment(req.body);

    const task = await taskServices.addComment(req.params.id, req.user.id, req.body.text);

    res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: { task },
    });
});

export const getDashboardStats = catchAsync(async (req, res) => {
    const stats = await taskServices.getDashboardStats(req.user.id);

    res.status(200).json({
        success: true,
        data: stats,
    });
});

export const getMyTasks = catchAsync(async (req, res) => {
    validateTaskQuery(req.query);

    console.log(req.user.id)
    console.log(req.query)
    const tasks = await taskServices.getMyTasks(req.user.id, req.query);

    res.status(200).json({
        success: true,
        data: tasks,
    });
});