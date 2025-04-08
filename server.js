const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://your-frontend-domain.vercel.app"
        : "http://localhost:3000",
    credentials: true, // Only needed if you're sending cookies/auth headers
  })
);
app.use(bodyParser.json());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/issue-tracker",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

// Models
const Issue = require("./models/Issue");
const Comment = require("./models/Comment");
const Milestone = require("./models/Milestone");

// Routes
app.use("/api/issues", require("./routes/issues"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/milestones", require("./routes/milestones"));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
