import dotenv from "dotenv";
import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import path from "path";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  validateFilePath,
  sanitizeFileContent,
  validateContentSize,
  validateFilePathInput,
  createSecurityConfig,
  logSecurityEvent,
} from "./utils/security.js";
import { VERSION } from "./version.js";

// Load environment variables from .env file
dotenv.config();

interface AppState {
  sessionId: string;
  requestCount: number;
  lastRequestTime: number;
}

const app: Express = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize security configuration
let securityConfig;
try {
  securityConfig = createSecurityConfig();
} catch (error) {
  console.error("Failed to initialize security config:", error);
  process.exit(1);
}

// Create app state
const appState: AppState = {
  sessionId: uuidv4(),
  requestCount: 0,
  lastRequestTime: Date.now(),
};

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet - Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
  })
);

// Disable CORS for local-only operation (unless explicitly enabled)
if (process.env.ENABLE_CORS !== "true") {
  app.use((_req: Request, res: Response, next: NextFunction): void => {
    res.header("Access-Control-Allow-Origin", "");
    next();
  });
}

// Body parsing with size limits
app.use(express.json({ limit: "1mb" }));

// Rate limiting middleware (simple in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

app.use((req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (record && record.resetTime > now) {
    record.count += 1;
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
      logSecurityEvent("Rate limit exceeded", { ip });
      res.status(429).json({ error: "Too many requests" });
      return;
    }
  } else {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  next();
});

// Request logging middleware (safe logging)
app.use((req: Request, _res: Response, next: NextFunction): void => {
  appState.requestCount += 1;
  appState.lastRequestTime = Date.now();

  console.info(`[${req.method}] ${req.path}`);

  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response): void => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Get file content
app.post("/api/file/read", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as { filePath?: unknown };
    const filePath = validateFilePathInput(body.filePath);

    if (!filePath) {
      res.status(400).json({ error: "Invalid file path format" });
      return;
    }

    const validation = validateFilePath(filePath, securityConfig);

    if (!validation.valid) {
      logSecurityEvent("Invalid file path access attempt", {
        error: validation.error,
      });
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Check if file is readable
    try {
      await fs.access(filePath, 0x4);
    } catch {
      res.status(403).json({ error: "File is not readable" });
      return;
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const content = await fs.readFile(filePath, "utf-8");
    const sanitized = sanitizeFileContent(content);

    res.json({
      content: sanitized,
      name: path.basename(filePath),
      path: filePath,
    });
  } catch (error) {
    logSecurityEvent("File read error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to read file" });
  }
});

// Save file content
app.post("/api/file/save", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as { filePath: unknown; content: unknown };
    const { filePath, content } = body;

    const validatedPath = validateFilePathInput(filePath);
    if (!validatedPath) {
      res.status(400).json({ error: "Invalid file path format" });
      return;
    }

    const validation = validateFilePath(validatedPath, securityConfig);
    if (!validation.valid) {
      logSecurityEvent("Invalid file path access attempt", {
        error: validation.error,
      });
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (typeof content !== "string") {
      res.status(400).json({ error: "Content must be a string" });
      return;
    }

    const contentValidation = validateContentSize(content, securityConfig.maxFileSize);
    if (!contentValidation.valid) {
      res.status(400).json({ error: contentValidation.error });
      return;
    }

    // Check if file is writable
    try {
      await fs.access(validatedPath, 0x2);
    } catch {
      res.status(403).json({ error: "File is not writable" });
      return;
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.writeFile(validatedPath, content, "utf-8");

    res.json({
      success: true,
      message: "File saved successfully",
      path: validatedPath,
    });
  } catch (error) {
    logSecurityEvent("File save error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to save file" });
  }
});

// List files in allowed directories
app.get("/api/files/list", async (_req: Request, res: Response): Promise<void> => {
  try {
    const files: { path: string; name: string; isDir: boolean }[] = [];

    // Recursively scan allowed directories for markdown files
    const scanDirectory = async (dirPath: string, depth: number = 0): Promise<void> => {
      if (depth > 5) return; // Limit depth to prevent excessive scanning

      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith(".md")) {
            files.push({
              path: fullPath,
              name: entry.name,
              isDir: false,
            });
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    // Scan all allowed directories
    for (const allowedDir of securityConfig.allowedDirectories) {
      await scanDirectory(allowedDir);
    }

    // Sort by path
    files.sort((a, b) => a.path.localeCompare(b.path));

    res.json({ files });
  } catch (error) {
    logSecurityEvent("File list error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to list files" });
  }
});

// Serve static files
app.use(express.static("public"));

// Health and info endpoint
app.get("/api/info", (_req: Request, res: Response): void => {
  res.json({
    version: VERSION,
    environment: NODE_ENV,
    sessionId: appState.sessionId,
    requestCount: appState.requestCount,
  });
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  logSecurityEvent("Unhandled error", {
    error: err instanceof Error ? err.message : "Unknown error",
  });
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================================
// Server Start
// ============================================================================

const server = app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
  console.info(`Environment: ${NODE_ENV}`);
  console.info(`Session ID: ${appState.sessionId}`);
  console.info(`Allowed directories: ${securityConfig.allowedDirectories.join(", ")}`);
});

// Handle graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.info(`${signal} received, shutting down gracefully`);

  // Stop accepting new connections
  server.close(() => {
    console.info("Server closed, all connections terminated");
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long (30 seconds)
  setTimeout(() => {
    console.warn("Graceful shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
