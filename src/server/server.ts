import { Application } from "express";
import { connectDatabase } from "../config/database";
import { initializeStoryScheduler } from "../services/schedulerService";

export const startServer = async (app: Application, PORT: number) => {
  try {
    console.log("Starting server...");

    // Connect to database
    console.log("Connecting to database...");
    await connectDatabase();
    console.log("Database connected successfully");

    // Start listening
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`Health check at http://localhost:${PORT}/api/health`);
      
      // Initialize story scheduler (default: 6 AM daily)
      initializeStoryScheduler();
      console.log('Daily story scheduler initialized');
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
