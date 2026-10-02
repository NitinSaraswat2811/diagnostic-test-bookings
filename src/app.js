const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Eve Healthcare API is running"
    });
});
const bookingRoutes = require("./routes/bookingRoutes");
const authRoutes = require("./routes/authRoutes");
const centreRoutes = require("./routes/centreRoutes");
const testRoutes = require("./routes/testRoutes");

app.use("/api/bookings", bookingRoutes);
app.use("/api/auth",authRoutes);
app.use("/api/centres",centreRoutes);
app.use("/api/tests",testRoutes);

module.exports = app;