
import mockCache from "./mocks/cache.mock.js";
import mockLogger from "./mocks/logger.mock.js";

import { vi } from 'vitest';

// This function should be called at top of test files BEFORE importing code that uses cache/logger
export function applyMocks() {
    vi.mock('../src/config/cache.js', () => ({ default: mockCache }));
    vi.mock('../src/config/logger.js', () => ({ logger: mockLogger, default: mockLogger }));
}