const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

router.post('/',authMiddleware.authMiddleware,paymentController.createPaymentController)

router.post('/webhook',paymentController.paymentWebhookController);

module.exports = router;
