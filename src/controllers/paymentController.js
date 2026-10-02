const pool = require("../config/db");

// Common payment processing logic
async function processPayment(
    bookingId,
    status,
    transactionId = null,
    webhookEventId = null
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Get booking and lock it
        const booking = await client.query(
            `SELECT id, amount, status
             FROM bookings
             WHERE id = $1
             FOR UPDATE`,
            [bookingId]
        );

        if (booking.rows.length === 0) {
            throw new Error("Booking not found");
        }

        const bookingData = booking.rows[0];

        // 2. Payment can only be processed for pending booking
        if (bookingData.status !== "PENDING") {
            throw new Error(
                "Payment cannot be processed for this booking"
            );
        }

        // 3. Create payment record
        const payment = await client.query(
            `INSERT INTO payments
             (booking_id, amount, status, transaction_id, webhook_event_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                bookingId,
                bookingData.amount,
                status,
                transactionId,
                webhookEventId
            ]
        );

        // 4. Update booking status
        const bookingStatus =
            status === "SUCCESS" ? "CONFIRMED" : "FAILED";

        const updatedBooking = await client.query(
            `UPDATE bookings
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [bookingStatus, bookingId]
        );

        // 5. Commit both operations together
        await client.query("COMMIT");

        return {
            payment: payment.rows[0],
            booking: updatedBooking.rows[0]
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}


// Simulated payment
async function createPaymentController(req, res) {
    const { bookingId, result } = req.body;

    // 1. Validate input
    if (!bookingId || !result) {
        return res.status(400).json({
            message: "Booking ID and payment result are required"
        });
    }

    // 2. Validate payment result
    if (result !== "SUCCESS" && result !== "FAILED") {
        return res.status(400).json({
            message: "Payment result must be SUCCESS or FAILED"
        });
    }

    // 3. Find booking
    const booking = await pool.query(
        `SELECT id, user_id, status
         FROM bookings
         WHERE id = $1`,
        [bookingId]
    );

    if (booking.rows.length === 0) {
        return res.status(404).json({
            message: "Booking not found"
        });
    }

    const bookingData = booking.rows[0];

    // 4. Verify ownership
    if (bookingData.user_id !== req.user.id) {
        return res.status(403).json({
            message: "You are not allowed to pay for this booking"
        });
    }

    // 5. Booking must be pending
    if (bookingData.status !== "PENDING") {
        return res.status(400).json({
            message: "Payment cannot be processed for this booking"
        });
    }

    try {
        const resultData = await processPayment(
            bookingId,
            result
        );

        return res.status(200).json({
            message: "Payment processed successfully",
            payment: resultData.payment,
            booking: resultData.booking
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Payment processing failed"
        });
    }
}


// Payment provider webhook
async function paymentWebhookController(req, res) {
    const {
        eventId,
        bookingId,
        status,
        transactionId
    } = req.body;

    // 1. Validate input
    if (!eventId || !bookingId || !status || !transactionId) {
        return res.status(400).json({
            message:
                "eventId, bookingId, status and transactionId are required"
        });
    }

    // 2. Validate payment status
    if (status !== "SUCCESS" && status !== "FAILED") {
        return res.status(400).json({
            message: "Payment status must be SUCCESS or FAILED"
        });
    }

    // 3. Check whether this webhook was already processed
    const existingEvent = await pool.query(
        `SELECT id, booking_id, status, transaction_id
         FROM payments
         WHERE webhook_event_id = $1`,
        [eventId]
    );

    if (existingEvent.rows.length > 0) {
        return res.status(200).json({
            message: "Webhook already processed",
            payment: existingEvent.rows[0]
        });
    }

    try {
        const resultData = await processPayment(
            bookingId,
            status,
            transactionId,
            eventId
        );

        return res.status(200).json({
            message: "Webhook processed successfully",
            payment: resultData.payment,
            booking: resultData.booking
        });

    } catch (error) {

        // Handles concurrent duplicate webhook
        if (error.code === "23505") {
            return res.status(200).json({
                message: "Webhook already processed"
            });
        }

        if (error.message === "Booking not found") {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        if (
            error.message ===
            "Payment cannot be processed for this booking"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error(error);

        return res.status(500).json({
            message: "Failed to process payment webhook"
        });
    }
}


module.exports = {
    createPaymentController,
    paymentWebhookController
};