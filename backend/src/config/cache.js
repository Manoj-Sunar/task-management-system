import { createClient } from 'redis';
import { logger } from './logger.js';

class CacheService {
      constructor() {
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    async connect() {
        try {
            const redisOptions = {
                url: process.env.REDIS_URL || "redis://localhost:6379",
                password: process.env.REDIS_PASSWORD || undefined,
                socket: {
                    reconnectStrategy: (retries) => {
                        this.reconnectAttempts = retries;
                        if (retries > 10) {
                            logger.warn('Too many Redis reconnection attempts');
                            return new Error('Too many retries');
                        }
                        return Math.min(retries * 100, 3000);
                    },
                    connectTimeout: 10000,
                    keepAlive: 5000
                }
            };

            this.client = createClient(redisOptions);

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis connected successfully');
                this.isConnected = true;
                this.reconnectAttempts = 0;
            });

            this.client.on('end', () => {
                logger.warn('Redis connection ended');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                logger.info(`Redis reconnecting... (attempt ${this.reconnectAttempts})`);
            });

            await this.client.connect();
            await this.client.ping();

            return this.client;
        } catch (error) {
            logger.error('Redis connection failed:', error);
            this.isConnected = false;
            // Don't throw in production to allow app to start without Redis
            if (process.env.NODE_ENV === 'production') {
                logger.warn('Continuing without Redis cache');
                return null;
            }
            throw error;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                this.isConnected = false;
                logger.info('Redis disconnected');
            } catch (error) {
                logger.error('Error disconnecting Redis:', error);
            }
        }
    }

    // ... rest of methods remain the same, but add better error handling
    async set(key, value, ttl = 3600) {
        if (!this.isConnected || !this.client) {
            if (process.env.NODE_ENV === 'development') {
                logger.warn('Redis not connected, skipping cache set');
            }
            return false;
        }

        try {
            const serializedValue = JSON.stringify(value);
            await this.client.set(key, serializedValue, {
                EX: ttl,
            });
            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    async get(key) {
        if (!this.isConnected || !this.client) {
            logger.warn('Redis not connected, skipping cache get');
            return null;
        }

        try {
            const data = await this.client.get(key);
            if (data) {
                logger.debug(`Cache hit: ${key}`);
                return JSON.parse(data);
            }
            logger.debug(`Cache miss: ${key}`);
            return null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    async del(key) {
        if (!this.isConnected || !this.client) {
            logger.warn('Redis not connected, skipping cache delete');
            return false;
        }

        try {
            const result = await this.client.del(key);
            logger.debug(`Cache deleted: ${key} (result: ${result})`);
            return result > 0;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    async clearPattern(pattern) {
        if (!this.isConnected || !this.client) {
            logger.warn('Redis not connected, skipping cache clear pattern');
            return false;
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.debug(`Cache cleared pattern: ${pattern}, keys: ${keys.length}`);
            }
            return keys.length;
        } catch (error) {
            logger.error('Cache clear pattern error:', error);
            return 0;
        }
    }

    async flushAll() {
        if (!this.isConnected || !this.client) {
            logger.warn('Redis not connected, skipping cache flush');
            return false;
        }

        try {
            await this.client.flushAll();
            logger.info('Cache flushed all');
            return true;
        } catch (error) {
            logger.error('Cache flush all error:', error);
            return false;
        }
    }

    async exists(key) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error:', error);
            return false;
        }
    }

    async ttl(key) {
        if (!this.isConnected || !this.client) {
            return -2; // Key doesn't exist
        }

        try {
            return await this.client.ttl(key);
        } catch (error) {
            logger.error('Cache TTL error:', error);
            return -2;
        }
    }
}


export default new CacheService();