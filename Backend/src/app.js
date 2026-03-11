const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use(express.json());
app.use(cookieParser());
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigin = new URL(frontendUrl).origin;

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);

// Require all the routes here
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

// Using all the routes here
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

module.exports = app;
