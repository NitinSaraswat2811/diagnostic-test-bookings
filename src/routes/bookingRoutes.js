const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const bookingController = require('../controllers/bookingController');

router.post('/',authMiddleware.authMiddleware,bookingController.createBookingController);

router.get("/", authMiddleware.authMiddleware, bookingController.getMyBookingsController);

router.get("/:id", authMiddleware.authMiddleware, bookingController.getBookingByIdController);

router.patch("/:id/cancel", authMiddleware.authMiddleware, bookingController.cancelBookingController);

module.exports = router;