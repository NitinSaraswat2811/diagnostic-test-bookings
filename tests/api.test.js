const request = require("supertest");
const app = require("../src/app");

const pool = require("../src/config/db");

describe("Eve Healthcare API", () => {
    let token;
    let userId;
    let centreId;
    let testId;
    let bookingId;

    const email = `test_${Date.now()}@example.com`;
    const password = "password123";

    beforeAll(async () => {
        // Register user
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email,
                password
            });

        expect(registerResponse.statusCode).toBe(201);

        token = registerResponse.body.token;
        userId = registerResponse.body.user.id;

        // Create diagnostic centre
        const centreResponse = await request(app)
            .post("/api/centres")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: `Test Diagnostic Centre ${Date.now()}`,
                location: "Agra, Uttar Pradesh"
            });

        expect(centreResponse.statusCode).toBe(201);

        centreId = centreResponse.body.centre.id;

        // Create diagnostic test
        const testResponse = await request(app)
            .post("/api/tests")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: `Test CBC ${Date.now()}`,
                description: "Test Complete Blood Count"
            });

        expect(testResponse.statusCode).toBe(201);

        testId = testResponse.body.test.id;

        // Assign test to centre
        const assignResponse = await request(app)
            .post(`/api/centres/${centreId}/tests`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                testId,
                price: 350
            });

        expect(assignResponse.statusCode).toBe(201);
    });

    afterAll(async () => {
        await pool.end();
    });

    test("should reject booking without authentication", async () => {
        const response = await request(app)
            .post("/api/bookings")
            .send({
                centreId,
                testId,
                appointmentDate: "2026-10-15",
                appointmentTime: "10:00"
            });

        expect(response.statusCode).toBe(401);
    });

    test("should create a booking", async () => {
        const response = await request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                centreId,
                testId,
                appointmentDate: "2026-10-15",
                appointmentTime: "10:00"
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.booking.status).toBe("PENDING");

        bookingId = response.body.booking.id;
    });

    test("should reject invalid appointment date", async () => {
        const response = await request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                centreId,
                testId,
                appointmentDate: "2026-99-99",
                appointmentTime: "10:00"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject invalid appointment time", async () => {
        const response = await request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                centreId,
                testId,
                appointmentDate: "2026-10-15",
                appointmentTime: "25:90"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should process simulated payment successfully", async () => {
        const response = await request(app)
            .post("/api/payments")
            .set("Authorization", `Bearer ${token}`)
            .send({
                bookingId,
                result: "SUCCESS"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.payment.status).toBe("SUCCESS");
        expect(response.body.booking.status).toBe("CONFIRMED");
    });

    test("should reject payment for an already processed booking", async () => {
        const response = await request(app)
            .post("/api/payments")
            .set("Authorization", `Bearer ${token}`)
            .send({
                bookingId,
                result: "SUCCESS"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject invalid payment result", async () => {
        const response = await request(app)
            .post("/api/payments")
            .set("Authorization", `Bearer ${token}`)
            .send({
                bookingId,
                result: "INVALID"
            });

        expect(response.statusCode).toBe(400);
    });
});