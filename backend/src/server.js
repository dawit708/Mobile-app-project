require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./routes/authRoutes");
const swaggerSpec = require("./config/swagger");
const pool = require("./config/database");

const app = express();

// ------------------------------------------------------------------
// helmet: allow Swagger UI's inline script/style, keep the rest secure
// ------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // needed by swagger-ui-express
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Campus API Docs",
    swaggerOptions: {
      persistAuthorization: true, // keeps the token after page reload
      docExpansion: "list",      // shows operations instead of collapsing
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// Raw JSON spec – very useful for debugging "no operations" problems
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "University Campus Life & Services API is running",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json({
      success: true,
      server: "Running",
      database: "Connected",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(500).json({
      success: false,
      server: "Running",
      database: "Disconnected",
      message: "Database connection failed",
    });
  }
});

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL Database: Connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log("Server Status: Running");
      console.log(`Server URL:  http://localhost:${PORT}`);
      console.log(`Swagger UI:  http://localhost:${PORT}/api-docs`);
      console.log(`Swagger JSON: http://localhost:${PORT}/api-docs.json`);
    });
  } catch (error) {
    console.error("Application startup failed!");
    console.error("PostgreSQL Database: Disconnected");
    console.error("Error:", error.message);
    process.exit(1);
  }
};

startServer();