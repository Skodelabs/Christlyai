import express, { Express, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { config } from "./config/env";
import { errorHandler } from "./middleware/error";
import apiRoutes from "./routes/index";
import { startServer } from "./server/server";

// Create Express app
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));
console.log(`Serving static files from: ${publicPath}`);

// API Routes
app.use("/api", apiRoutes);

// Root route - serve the HTML landing page
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// API status route
app.get("/api/status", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Christly AI API is running",
    version: "1.0.0"
  });
});

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
const PORT = config.port;

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  process.exit(1);
});

// Start the server
startServer(app, PORT as number);
