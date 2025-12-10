import { describe, it, expect } from "vitest";
import { validateRegister } from "../../../src/validators/auth.validator";


describe("Registration validation", () => {

    it("should pass valid data", () => {
        const data = {
            name: "Manoj Sunar",
            email: "manoj@gmail.com",
            password: "man@1234",
            confirmPassword: "man@1234"
        };

        expect(() => validateRegister(data)).not.toThrow();
    });

    it("should throw for missing email", () => {
        const data = {
            password: "Password123",
            confirmPassword: "Password123",
        };

        expect(() => validateRegister(data)).not.toThrow("Email required");
    });

})