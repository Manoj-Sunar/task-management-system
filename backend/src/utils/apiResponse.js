export class ApiResponse {
    constructor(statusCode, success, message, data = null, errors = null) {
        this.statusCode = statusCode;
        this.success = success;
        this.message = message;
        this.data = data;
        this.errors = errors;
        this.timestamp = new Date().toISOString();
    }

    static success(message, data = null) {
        return new ApiResponse(200, true, message, data);
    }

    static created(message, data = null) {
        return new ApiResponse(201, true, message, data);
    }

    static badRequest(message, errors = null) {
        return new ApiResponse(400, false, message, null, errors);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiResponse(401, false, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiResponse(403, false, message);
    }

    static notFound(message = 'Not found') {
        return new ApiResponse(404, false, message);
    }

    static conflict(message = 'Conflict') {
        return new ApiResponse(409, false, message);
    }

    static internalError(message = 'Internal server error') {
        return new ApiResponse(500, false, message);
    }

    static validationError(errors) {
        return new ApiResponse(422, false, 'Validation failed', null, errors);
    }

    toJSON() {
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            errors: this.errors,
            timestamp: this.timestamp,
        };
    }
}

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};