// tests/mocks/cache.mock.js
import { vi } from 'vitest';

const mock = {
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    connect: vi.fn().mockResolvedValue(true),
    isConnected: false,
};

export default mock;
