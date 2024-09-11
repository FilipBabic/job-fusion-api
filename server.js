import express from "express";
import cors from "cors";
import users from "./routes/users.js";
import jobs from "./routes/jobs.js";
import admins from "./routes/admins.js";
import recruiters from "./routes/recruiters.js";
import logger from "./middleware/logger.js";
import errorHandler from "./middleware/errors/error.js";
import notFound from "./middleware/errors/not-found.js";

const port = process.env.PORT || 8000;

const app = express();

const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 200,
};

// Apply CORS options
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logger middleware
app.use(logger);

// Routes //

// User routes
app.use("/api", users);

// Job postings routes
app.use("/api/jobs", jobs);

// Admin routes
app.use("/api/admins", admins);

// Recruiters routes
app.use("/api/recruiters", recruiters);
// Error handler middleware
app.use(notFound);
app.use(errorHandler);

app.listen(5000, () => console.log(`The Server is running on port ${port}`));
