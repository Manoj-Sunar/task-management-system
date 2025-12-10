import { applyMocks } from '../helpers';

applyMocks();
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { User } from '../../src/models/user';

import { cleanupDatabase, closeTestEnv, setupTestEnv } from '../setup';
import mockCache from "../mocks/cache.mock.js";
import { app } from '../../app.js';

describe("/api/v1/auth/login", () => {

    beforeAll(async () => {
        await setupTestEnv();
    });

    afterEach(async () => {
        await cleanupDatabase();
        vi.clearAllMocks();
    });

    afterAll(async () => {
        await closeTestEnv();
    });


    it('logs in registered user and returns token + caches user', async () => {
        const payload = { name: 'Manoj', email: 'manoj@test.com', password: 'Password123' };
        await User.create(payload);

        const res = await request(app).post("/api/v1/auth/login").send({ email: "manoj@test.com", password: "Password123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user).toBeDefined();

        expect(mockCache.set).toHaveBeenCalled();


    });

    it("reject invalid credential", async () => {
        const payload = { name: 'Manoj', email: 'manoj@test.com', password: 'Password123' };
        await User.create(payload);

        const res = await request(app).post("/api/v1/auth/login").send({ email: "manoj@test.com", password: 'wrong' });
        expect(res.status).toBe(401);
        expect(res.body.success).toBeFalsy();
    });


    it("account is deactivated", async () => {
        const payload = { name: 'Manoj', email: 'manoj@test.com', password: 'Password123', isActive:false };
        await User.create(payload);
        const res = await request(app).post("/api/v1/auth/login").send({ email: "manoj@test.com", password: "Password123" });
        expect(res.status).toBe(401);

    })




})