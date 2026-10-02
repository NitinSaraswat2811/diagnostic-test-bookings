const pool = require('../config/db');

async function createBookingController(req,res){
    const {centreId, testId,appointmentDate,appointmentTime} = req.body;

    if(!centreId || !testId || !appointmentDate || !appointmentTime){
        return res.status(400).json({
            message:"Centre, test, appointment date and appointment time are required"
        })
    }
    //Checking whether date and time are valid or not 

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

if (!dateRegex.test(appointmentDate)) {
    return res.status(400).json({
        message: "Appointment date must be in YYYY-MM-DD format"
    });
}

const [year, month, day] = appointmentDate.split("-").map(Number);

const date = new Date(year, month - 1, day);

if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
) {
    return res.status(400).json({
        message: "Invalid appointment date"
    });
}

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

if (!timeRegex.test(appointmentTime)) {
    return res.status(400).json({
        message: "Appointment time must be in HH:MM format"
    });
}

//verifying the center and test

const centreTest = await pool.query(
    `SELECT price
     FROM centre_tests
     WHERE centre_id = $1 AND test_id = $2`,
    [centreId, testId]
);

if (centreTest.rows.length === 0) {
    return res.status(400).json({
        message: "This test is not available at this centre"
    });
}
const bookingPrice = centreTest.rows[0].price;
const userId = req.user.id;

const result = await pool.query(
    `INSERT INTO bookings
     (user_id, test_id, centre_id, appointment_date, appointment_time, amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
        userId,
        testId,
        centreId,
        appointmentDate,
        appointmentTime,
        bookingPrice,
        "PENDING"
    ]
);
return res.status(201).json({
    message: "Booking created successfully",
    booking: result.rows[0]
});
}

async function getBookingByIdController(req,res){
    const {id} = req.params;
    const userId = req.user.id;

    const booking = await pool.query(
        `SELECT 
        user_id, test_id, centre_id, appointment_date, appointment_time, amount, status
        FROM bookings 
        WHERE id = $1 AND user_id = $2`,
        [id,userId]
    )
    if(booking.rows.length==0){
        return res.status(404).json({
            message:"No such booking exists"
        })
    }

    return res.status(200).json({
        booking:booking.rows[0]
    })
}

async function getMyBookingsController(req,res){
    const userId = req.user.id;

    const bookings = await pool.query(
        `SELECT *
        FROM bookings
        WHERE user_id = $1
     ORDER BY created_at DESC`,
     [userId]
    )
     return res.status(200).json({
        bookings: bookings.rows
    });
}

async function cancelBookingController(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await pool.query(
        `SELECT id, status
         FROM bookings
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );

    if (booking.rows.length === 0) {
        return res.status(404).json({
            message: "Booking not found"
        });
    }

    if (booking.rows[0].status === "CANCELLED") {
        return res.status(400).json({
            message: "Booking is already cancelled"
        });
    }

    const result = await pool.query(
        `UPDATE bookings
         SET status = 'CANCELLED'
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
    );

    return res.status(200).json({
        message: "Booking cancelled successfully",
        booking: result.rows[0]
    });
}

module.exports = {
    createBookingController,
    getBookingByIdController,
    getMyBookingsController,
    cancelBookingController
}