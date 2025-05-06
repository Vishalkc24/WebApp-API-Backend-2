// Log before initializing the Express app
console.log("Before Express app initialization");

// Import necessary modules
const express = require('express');         // Import Express framework
const cors = require('cors');               // Import the cors package
const dotenv = require('dotenv');           // Import dotenv to load environment variables
const { Pool } = require('pg');             // Import PostgreSQL connection pool

// Initialize dotenv to load environment variables from .env file
dotenv.config();

// Database connection configuration using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Import the routes from routeRoutes.js
const routeRoutes = require('./routes/routeRoutes');

// Import the trips from tripRoutes.js
const tripRoutes = require('./routes/tripRoutes');

// Import the stops from stopRoutes.js
const stopRoutes = require('./routes/stopRoutes');

// Import the stop times from stopTimeRoutes.js
const stoptimeRoutes = require('./routes/stopTimeRoutes');

// Import the new route for shortest path calculation
const shortestPathRoutes = require('./routes/shortestPathRoutes');

// Import the shapes from shapeRoutes.js
const shapeRoutes = require('./routes/shapeRoutes');

// Log indicating the server is starting
console.log("Starting the server...");

// Initialize the Express app
const app = express();

// Enable CORS for all domains (this allows all cross-origin requests)
app.use(cors());

// Middleware to handle JSON requests
app.use(express.json());

// Use the imported routes in the app
app.use(routeRoutes);
app.use(tripRoutes);
app.use(stopRoutes);
app.use(stoptimeRoutes);
app.use(shortestPathRoutes);
app.use(shapeRoutes);

// Define the port from environment variables or fallback to 3000
const PORT = process.env.PORT || 3000;

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Log after Express app has been initialized
console.log("After Express app initialization");

// Global error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Optional Placeholder: Logic to ensure OSM download and DB population (call from separate script)
/*
  // 1. Write a Python script using osmnx to download the map and extract routes
  // 2. Save each route segment (e.g., a-b, b-c, etc.) and distances to PostgreSQL
  // 3. Trigger it manually or on server start using Node's child_process module:
  
  const { exec } = require('child_process');
  exec('python3 ./scripts/process_osm_routes.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Python stderr: ${stderr}`);
      return;
    }
    console.log(`Python script output: ${stdout}`);
  });
*/
