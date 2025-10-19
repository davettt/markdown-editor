import { resolve, normalize } from "path";
import { existsSync, statSync } from "fs";

/**
 * Configuration for security checks
 */
interface SecurityConfig {
  allowedDirectories: string[];
  maxFileSize: number;
  allowedExtensions: string[];
}

/**
 * Validates that a file path is within allowed directories
 * Prevents directory traversal attacks
 */
export function validateFilePath(
  filePath: string,
  config: SecurityConfig
): { valid: boolean; error?: string } {
  try {
    // Normalize the path to handle .. and .
    const normalizedPath = normalize(resolve(filePath));

    // Check if file exists
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!existsSync(normalizedPath)) {
      return { valid: false, error: "File does not exist" };
    }

    // Check if it's a file (not a directory)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const stats = statSync(normalizedPath);
    if (!stats.isFile()) {
      return { valid: false, error: "Path is not a file" };
    }

    // Check if path is within allowed directories
    const isAllowed = config.allowedDirectories.some((allowedDir) => {
      const normalizedAllowed = normalize(resolve(allowedDir));
      return (
        normalizedPath.startsWith(normalizedAllowed + "/") ||
        normalizedPath.startsWith(normalizedAllowed)
      );
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: "File is outside allowed directories",
      };
    }

    // Check file extension
    const extension = normalizedPath.split(".").pop()?.toLowerCase();
    if (!extension || !config.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed`,
      };
    }

    // Check file size
    if (stats.size > config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size (${config.maxFileSize} bytes)`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Path validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Sanitizes file content to prevent XSS when rendering
 * This is important for user-provided markdown content
 */
export function sanitizeFileContent(content: string): string {
  // Ensure content is a string
  if (typeof content !== "string") {
    return "";
  }

  // Remove potentially dangerous characters at the start of the file
  // (null bytes, BOM characters, etc.)
  return content.replace(/^\ufeff/, "").replace(/\0/g, "");
}

/**
 * Validates file content size
 */
export function validateContentSize(
  content: string,
  maxSize: number
): { valid: boolean; error?: string } {
  const sizeInBytes = Buffer.byteLength(content, "utf8");

  if (sizeInBytes > maxSize) {
    return {
      valid: false,
      error: `Content exceeds maximum size (${maxSize} bytes)`,
    };
  }

  return { valid: true };
}

/**
 * Validates API request input
 */
export function validateFilePathInput(input: unknown): string | null {
  // Ensure input is a string
  if (typeof input !== "string") {
    return null;
  }

  // Trim and check length
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0 || trimmedInput.length > 500) {
    return null;
  }

  // Check for suspicious patterns
  if (trimmedInput.includes("\0") || trimmedInput.includes("\n") || trimmedInput.includes("\r")) {
    return null;
  }

  return trimmedInput;
}

/**
 * Creates a SecurityConfig from environment variables
 */
export function createSecurityConfig(): SecurityConfig {
  const allowedDirs = process.env.ALLOWED_DIRECTORIES || "";
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10);

  const allowedDirectories = allowedDirs
    .split(",")
    .map((dir) => dir.trim())
    .filter((dir) => dir.length > 0);

  if (allowedDirectories.length === 0) {
    throw new Error("No allowed directories configured");
  }

  return {
    allowedDirectories,
    maxFileSize: maxSize,
    allowedExtensions: ["md", "markdown", "txt"],
  };
}

/**
 * Safely logs errors without exposing sensitive paths
 */
export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  // Never log file paths or sensitive content
  const safeDetails = {
    ...details,
    filePath: "[REDACTED]",
    content: "[REDACTED]",
  };

  console.error(`[SECURITY] ${event}`, safeDetails);
}
