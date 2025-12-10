import cache from "../config/cache.js";




export const cacheMiddleware = (duration = 3600) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip cache for authenticated routes if needed
        if (req.user && req.skipCache) {
            return next();
        }

        const key = `cache:${req.originalUrl}:${req.user?._id || 'public'}`;

        try {
            const cachedData = await cache.get(key);

            if (cachedData) {
                // Add cache hit header
                res.set('X-Cache', 'HIT');
                return res.json(cachedData);
            }

            // Add cache miss header
            res.set('X-Cache', 'MISS');

            // Store original send function
            const originalJson = res.json;

            res.json = function (data) {
                // Cache successful responses (status 200-299)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cache.set(key, data, duration).catch(err => {
                        console.error('Cache set error:', err);
                    });
                }
                originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

export const clearCache = (pattern) => {
    return async (req, res, next) => {
        req.clearCachePattern = pattern;
        next();
    };
};