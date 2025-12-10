
import { logger } from '../config/logger.js';
import { StatusCodes } from 'http-status-codes';
import dayjs from 'dayjs';
import { User } from '../models/user.js';
import Task from '../models/task.js';  // Fixed path - singular 'models'
import { AppError } from '../middlewares/error-handler.js';
import cache from '../config/cache.js';



class TaskService {
    async createTask(taskData, userId) {

        console.log(taskData);
        // Check if assigned user exists
        const assignedUser = await User.findById(taskData.assignedTo);
        if (!assignedUser) {
            throw new AppError('Assigned user not found', StatusCodes.NOT_FOUND);
        }

        const task = await Task.create({
            ...taskData,
            createdBy: userId,
        });

        // Clear relevant caches
        await this.clearTaskCaches(userId, taskData.assignedTo);

        logger.info(`Task created: ${task.title} by user ${userId}`, {
            taskId: task._id,
            createdBy: userId,
            assignedTo: taskData.assignedTo
        });

        return task;
    }

    async getTasks(query, userId) {
        const {
            status,
            priority,
            assignedTo,
            createdBy,
            tags,
            search,
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 10,
        } = query;

        // Build query object
        const filter = { isDeleted: false };

        // Apply filters
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (createdBy) filter.createdBy = createdBy;
        
        if (tags) {
            filter.tags = { $all: tags.split(',') };
        }

        // Add search functionality
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        // Create cache key
        const cacheKey = `tasks:${JSON.stringify({
            filter,
            sortBy,
            order,
            page,
            limit,
            userId
        })}`;
        
        // Try to get from cache
        const cachedTasks = await cache.get(cacheKey);
        if (cachedTasks) {
            logger.debug('Tasks cache hit', { cacheKey });
            return cachedTasks;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = order === 'desc' ? -1 : 1;

        // Execute query with pagination
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            populate: [
                { path: 'assignedTo', select: 'name email profile' },
                { path: 'createdBy', select: 'name email profile' },
            ],
            lean: true,
        };

        const tasks = await Task.paginate(filter, options);

        // Cache the result
        await cache.set(cacheKey, tasks, 300); // 5 minutes cache

        logger.debug('Tasks fetched from database', {
            page,
            limit,
            total: tasks.totalDocs,
            cacheKey
        });

        return tasks;
    }

    async getTaskById(taskId, userId) {
        const cacheKey = `task:${taskId}`;
        
        // Try to get from cache
        const cachedTask = await cache.get(cacheKey);
        if (cachedTask) {
            logger.debug('Task cache hit', { taskId, cacheKey });
            
            // Check permissions
            if (cachedTask.assignedTo._id.toString() !== userId && 
                cachedTask.createdBy._id.toString() !== userId) {
                throw new AppError('You do not have permission to view this task', StatusCodes.FORBIDDEN);
            }
            
            return cachedTask;
        }

        const task = await Task.findOne({ _id: taskId, isDeleted: false })
            .populate('assignedTo', 'name email profile')
            .populate('createdBy', 'name email profile')
            .populate('comments.user', 'name email profile')
            .lean();

        if (!task) {
            throw new AppError('Task not found', StatusCodes.NOT_FOUND);
        }

        // Check permissions
        if (task.assignedTo._id.toString() !== userId && task.createdBy._id.toString() !== userId) {
            throw new AppError('You do not have permission to view this task', StatusCodes.FORBIDDEN);
        }

        // Cache the task
        await cache.set(cacheKey, task, 300);

        logger.debug('Task fetched from database', { taskId });

        return task;
    }

    async updateTask(taskId, updateData, userId) {
        const task = await Task.findOne({ _id: taskId, isDeleted: false });
        if (!task) {
            throw new AppError('Task not found', StatusCodes.NOT_FOUND);
        }

        // Check permissions
        if (task.createdBy.toString() !== userId) {
            throw new AppError('You can only update tasks you created', StatusCodes.FORBIDDEN);
        }

        // If reassigning, check if new user exists
        if (updateData.assignedTo && updateData.assignedTo !== task.assignedTo.toString()) {
            const assignedUser = await User.findById(updateData.assignedTo);
            if (!assignedUser) {
                throw new AppError('Assigned user not found', StatusCodes.NOT_FOUND);
            }
        }

        Object.assign(task, updateData);
        await task.save();

        // Clear caches
        await this.clearTaskCaches(userId, task.assignedTo);
        await cache.del(`task:${taskId}`);

        logger.info(`Task updated: ${taskId} by user ${userId}`, {
            taskId,
            updatedBy: userId,
            updates: Object.keys(updateData)
        });

        return task;
    }

    async deleteTask(taskId, userId) {
        const task = await Task.findOne({ _id: taskId, isDeleted: false });
        if (!task) {
            throw new AppError('Task not found', StatusCodes.NOT_FOUND);
        }

        // Check permissions
        if (task.createdBy.toString() !== userId) {
            throw new AppError('You can only delete tasks you created', StatusCodes.FORBIDDEN);
        }

        await task.softDelete();

        // Clear caches
        await this.clearTaskCaches(userId, task.assignedTo);
        await cache.del(`task:${taskId}`);

        logger.info(`Task deleted: ${taskId} by user ${userId}`, {
            taskId,
            deletedBy: userId
        });

        return true;
    }

    async addComment(taskId, userId, text) {
        const task = await Task.findOne({ _id: taskId, isDeleted: false });
        if (!task) {
            throw new AppError('Task not found', StatusCodes.NOT_FOUND);
        }

        // Check if user is assigned to or created the task
        const isAssigned = task.assignedTo.toString() === userId;
        const isCreator = task.createdBy.toString() === userId;
        
        if (!isAssigned && !isCreator) {
            throw new AppError('You cannot comment on this task', StatusCodes.FORBIDDEN);
        }

        await task.addComment(userId, text);

        // Clear cache
        await cache.del(`task:${taskId}`);

        logger.info(`Comment added to task: ${taskId} by user ${userId}`, {
            taskId,
            commentedBy: userId,
            commentLength: text.length
        });

        return task;
    }

    async getDashboardStats(userId) {
        const cacheKey = `dashboard:${userId}`;
        
        // Try to get from cache
        const cachedStats = await cache.get(cacheKey);
        if (cachedStats) {
            logger.debug('Dashboard cache hit', { userId, cacheKey });
            return cachedStats;
        }

        const today = dayjs().startOf('day');
        const weekAgo = dayjs().subtract(7, 'day').startOf('day');

        const [
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            recentTasks,
            tasksByStatus,
            tasksByPriority,
            weeklyActivity,
        ] = await Promise.all([
            Task.countDocuments({ assignedTo: userId, isDeleted: false }),
            Task.countDocuments({ 
                assignedTo: userId, 
                isDeleted: false,
                status: 'done' 
            }),
            Task.countDocuments({ 
                assignedTo: userId, 
                isDeleted: false,
                status: 'in_progress' 
            }),
            Task.countDocuments({
                assignedTo: userId,
                isDeleted: false,
                dueDate: { $lt: new Date() },
                status: { $ne: 'done' },
            }),
            Task.find({ 
                assignedTo: userId, 
                isDeleted: false 
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('createdBy', 'name')
                .lean(),
            Task.aggregate([
                { $match: { 
                    assignedTo: userId, 
                    isDeleted: false 
                }},
                { $group: { 
                    _id: '$status', 
                    count: { $sum: 1 } 
                }},
            ]),
            Task.aggregate([
                { $match: { 
                    assignedTo: userId, 
                    isDeleted: false 
                }},
                { $group: { 
                    _id: '$priority', 
                    count: { $sum: 1 } 
                }},
            ]),
            Task.aggregate([
                { $match: { 
                    assignedTo: userId,
                    isDeleted: false,
                    updatedAt: { $gte: weekAgo.toDate() }
                }},
                { $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ])
        ]);

        const stats = {
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            recentTasks,
            tasksByStatus: tasksByStatus.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            tasksByPriority: tasksByPriority.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            weeklyActivity: weeklyActivity.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        };

        // Cache stats for 5 minutes
        await cache.set(cacheKey, stats, 300);

        logger.debug('Dashboard stats generated', { userId });

        return stats;
    }

    async getMyTasks(userId, query) {
        const cacheKey = `mytasks:${userId}:${JSON.stringify(query)}`;
        
        // Try to get from cache
        const cachedTasks = await cache.get(cacheKey);
        if (cachedTasks) {
            logger.debug('My tasks cache hit', { userId, cacheKey });
            return cachedTasks;
        }

        const tasks = await this.getTasks(
            { ...query, assignedTo: userId },
            userId
        );

        // Cache the result
        await cache.set(cacheKey, tasks, 300);

        return tasks;
    }

    async clearTaskCaches(creatorId, assigneeId) {
        try {
            // Clear user-specific caches
            await cache.del(`dashboard:${creatorId}`);
            await cache.del(`dashboard:${assigneeId}`);
            
            // Clear task list caches with pattern matching
            const patterns = [
                `tasks:*${creatorId}*`,
                `tasks:*${assigneeId}*`,
                `mytasks:${creatorId}:*`,
                `mytasks:${assigneeId}:*`
            ];

            for (const pattern of patterns) {
                await cache.clearPattern(pattern);
            }

            logger.debug('Task caches cleared', { creatorId, assigneeId });
        } catch (error) {
            logger.error('Error clearing task caches:', error);
        }
    }
}

export default new TaskService();