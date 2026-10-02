const express = require('express');

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const testController = require("../controllers/testController");

router.post("/",authMiddleware.authMiddleware,testController.createTestController);

router.get("/",testController.getAllTestsController);

router.get("/:id",testController.getTestByIdController);

module.exports = router;
