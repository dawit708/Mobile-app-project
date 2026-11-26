const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

// glob needs forward slashes even on Windows
const toPosix = (p) => p.split(path.sep).join("/");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "University Campus Life & Services API",
      version: "1.0.0",
      description:
        "REST API documentation for the University Campus Life & Services App",
    },

    servers: [
      { url: "http://localhost:5000", description: "Local development server" },
    ],

    tags: [
      { name: "Authentication", description: "User registration and authentication" },
    ],

    components: {
      securitySchemes: {
        // ---------- JWT bearer ----------
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Paste ONLY the accessToken value returned by /api/auth/login (no 'Bearer ' prefix).",
        },

        // ---------- (optional) API key ----------
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",          // "header" | "query" | "cookie"
          name: "X-API-Key",
          description: "Enter your API key",
        },
      },
    },

  
    security: [{ bearerAuth: [] }],
  },

  apis: [
    toPosix(path.join(__dirname, "..", "server.js")),
    toPosix(path.join(__dirname, "..", "routes", "*.js")),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// Fail loudly instead of showing an empty UI
const pathCount = Object.keys(swaggerSpec.paths || {}).length;
if (pathCount === 0) {
  console.warn(
    "[swagger] WARNING: 0 paths found. Checked globs:\n" + options.apis.join("\n")
  );
} else {
  console.log(`[swagger] ${pathCount} endpoint(s) loaded:`, Object.keys(swaggerSpec.paths));
}

module.exports = swaggerSpec;