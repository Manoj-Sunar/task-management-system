import express from 'express';
import { authorize, protect } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cache-middleware.js';
import {
    addComment,
    createTask,
    deleteTask,
    getDashboardStats,
    getMyTasks,
    getTask,
    getTasks,
    updateTask
} from '../controllers/task.controller.js';  // Fixed path - capitalize 'C' in Controllers

const taskRouter = express.Router();

// All task routes are protected
taskRouter.use(protect);

// Routes with caching
taskRouter.route('/').post(authorize('admin', 'manager'), createTask).get(cacheMiddleware(300), getTasks);

taskRouter.route('/my-tasks')
    .get(cacheMiddleware(300), getMyTasks);




taskRouter.route('/dashboard')
    .get(cacheMiddleware(300), getDashboardStats);

taskRouter.route('/:id')

    .get(cacheMiddleware(300), getTask)
    .patch(updateTask)
    .delete(deleteTask);

taskRouter.route('/:id/comments')

    .post(addComment);

    export default taskRouter;