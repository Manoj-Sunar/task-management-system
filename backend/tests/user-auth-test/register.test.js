import { applyMocks } from "../helpers.js";
applyMocks();


import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import { cleanupDatabase, closeTestEnv, setupTestEnv } from "../setup.js";
import { app } from "../../app.js";
import jwt from "jsonwebtoken";
import { User } from "../../src/models/user.js";
import mockCache from "../mocks/cache.mock.js"



describe('POST /api/v1/auth/register', () => {
    beforeAll(async () => {
        await setupTestEnv();
    });

    afterEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await closeTestEnv();
    });


    it('registers user, returns token, caches user and stores hashed password', async () => {

        const payload = {
            name: "Manoj",
            email: "manoj@test.com",
            password: "Password123",
            confirmPassword: "Password123"
        };


        const response = await request(app)
            .post("/api/v1/auth/register")
            .send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe("manoj@test.com");
        expect(response.body.data).toBeDefined();


        // assert token is valid JWT and contains user id
        const token = response.body.data.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded.id).toBeDefined();


        // check DB user exists and password is hashed
        const dbUser = await User.findOne({ email: payload.email }).select('+password');
        expect(dbUser).toBeTruthy();
        expect(dbUser.password).not.toBe(payload.password);

        // check cache.set called with user key and TTL
        expect(mockCache.set).toHaveBeenCalled();
        const [keyArg, valueArg, ttlArg] = mockCache.set.mock.calls[0];
        expect(keyArg).toMatch(/^user:/);
        expect(valueArg).toHaveProperty('email', payload.email);
        expect(ttlArg).toBe(3600);

    });





})

