// tests/setup/unit.setup.js
import { vi, beforeEach, afterEach } from 'vitest'
import mockCache from "../../mocks/cache.mock.js";
import mockLogger from  "../../mocks/logger.mock.js";


// This function should be called at top of test files BEFORE importing code that uses cache/logger
export function applyMocks() {
    vi.mock('../../../src/config/cache.js', () => ({ 
        default: mockCache,
        ...mockCache 
    }))
    vi.mock('../../../src/config/logger.js', () => ({ 
        logger: mockLogger, 
        default: mockLogger 
    }))
}

// Global setup for unit tests
beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Reset cache mock state
    mockCache.set.mockClear()
    mockCache.get.mockClear()
    mockCache.del.mockClear()
    mockCache.disconnect.mockClear()
    mockCache.connect.mockClear()
    mockCache.isConnected = false
    
    // Reset environment variables
    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = 'test-secret'
})

afterEach(() => {
    vi.resetModules()
})