import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2';

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'review', 'done'],
        default: 'todo',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    dueDate: {
        type: Date,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    estimatedHours: {
        type: Number,
        min: 0,
        max: 1000
    },
    actualHours: {
        type: Number,
        min: 0,
        default: 0
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: Date,
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    attachments: [{
        filename: String,
        url: String,
        size: Number,
        mimetype: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes for better query performance
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ isCompleted: 1 });


// Add pagination plugin
taskSchema.plugin(mongoosePaginate);

// Virtual for overdue tasks
taskSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.isCompleted) return false;
    return this.dueDate < new Date();
});

// Method to add comment
taskSchema.methods.addComment = function (userId, text) {
    this.comments.push({
        user: userId,
        text: text
    });
    return this.save();
};

// Method to mark as complete
taskSchema.methods.markComplete = function () {
    this.isCompleted = true;
    this.status = 'done';
    this.completedAt = new Date();
    return this.save();
};

// Soft delete method
taskSchema.methods.softDelete = function () {
    this.isDeleted = true;
    return this.save();
};

// Pre-save hook to update isCompleted based on status
taskSchema.pre('save', function () {
    if (this.status === 'done' && !this.isCompleted) {
        this.isCompleted = true;
        this.completedAt = new Date();
    } else if (this.status !== 'done' && this.isCompleted) {
        this.isCompleted = false;
        this.completedAt = undefined;
    }
});


// Static method to find active tasks
taskSchema.statics.findActive = function () {
    return this.find({ isDeleted: false });
};

// Static method to find user's tasks
taskSchema.statics.findByUser = function (userId, role = 'assigned') {
    const query = { isDeleted: false };
    
    if (role === 'assigned') {
        query.assignedTo = userId;
    } else if (role === 'created') {
        query.createdBy = userId;
    }
    
    return this.find(query);
};

export default mongoose.model('Task', taskSchema);