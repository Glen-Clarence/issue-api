const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.use((req, res, next) => {
  console.log("Incoming origin:", req.headers.origin);
  next();
});

// MongoDB connection
const mongoURI =
  process.env.NODE_ENV === "production"
    ? process.env.MONGODB_URI_PROD
    : process.env.MONGODB_URI_DEV;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

// JWT Secret
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}

// Models
const Issue = require("./models/Issue");
const Comment = require("./models/Comment");
const Milestone = require("./models/Milestone");
const User = require("./models/User");

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/issues", require("./routes/issues"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/milestones", require("./routes/milestones"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/users", require("./routes/users"));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
