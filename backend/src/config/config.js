export const config = {
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  
  api: {
    version: process.env.API_VERSION || 'v1'
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET,
    cookieSecret: process.env.COOKIE_SECRET,
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      maxAge: parseInt(process.env.CORS_MAX_AGE || '86400')
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15') * 60 * 1000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      whitelist: process.env.RATE_LIMIT_WHITELIST?.split(',') || []
    }
  },
  
  database: {
    uri: process.env.MONGODB_URI,
    useMemory: process.env.USE_MONGODB_MEMORY === 'true',
    retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '5'),
    retryDelay: parseInt(process.env.DB_RETRY_DELAY || '5000')
  },
  
  upload: {
    maxSize: process.env.UPLOAD_MAX_SIZE || '10mb',
    parameterLimit: parseInt(process.env.UPLOAD_PARAMETER_LIMIT || '50')
  },
  
  performance: {
    slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000')
  },
  
  shutdown: {
    timeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000')
  },
  
  validate: function() {
    const required = ['JWT_SECRET', 'MONGODB_URI'];
    if (this.isProduction) {
      required.push('REDIS_URL');
    }
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
};