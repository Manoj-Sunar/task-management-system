import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'manager'],
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
    },
    refreshToken: {
        type: String,
        select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    profile: {
        avatar: String,
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot exceed 500 characters'],
        },
        phone: String,
        address: {
            street: String,
            city: String,
            country: String,
            zipCode: String,
        },
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto',
        },
        notifications: {
            email: {
                type: Boolean,
                default: true,
            },
            push: {
                type: Boolean,
                default: true,
            },
        },
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});



userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);

        if (!this.isNew) {
            this.passwordChangedAt = Date.now() - 1000;
        }
    }
});



// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
};

// Update last login
userSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save({ validateBeforeSave: false });
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

// Method to get public profile
userSchema.methods.toAuthJSON = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        profile: this.profile,
        preferences: this.preferences,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

export const User = mongoose.model('User', userSchema);