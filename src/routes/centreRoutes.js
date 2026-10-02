const express = require('express');

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const centreController = require("../controllers/centreController");

router.post("/",authMiddleware.authMiddleware,centreController.createCentreController);
router.post("/:centreId/tests",authMiddleware.authMiddleware, centreController.assignTestToCentreController);
router.get("/",authMiddleware.authMiddleware,centreController.getAllCentresController);
router.get("/:id",authMiddleware.authMiddleware,centreController.getCentreByIdController);
router.get("/:id/tests",authMiddleware.authMiddleware,centreController.getCentreTestsController);


module.exports = router;