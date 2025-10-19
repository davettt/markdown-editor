# Security Architecture

This document outlines the security measures implemented in the Markdown Editor.

## Threat Model

### Threats We Protect Against

1. **Directory Traversal Attacks** - Accessing files outside allowed directories
2. **XSS (Cross-Site Scripting)** - Injecting malicious scripts via markdown
3. **Unauthorized File Access** - Reading/writing files without permission
4. **Resource Exhaustion** - Large files or rate limit abuse
5. **Credential Leakage** - Exposing secrets in logs or errors
6. **Dependency Vulnerabilities** - Using vulnerable libraries

### Threats Out of Scope

1. **Local privilege escalation** - Assumes attacker has same user permissions
2. **Physical attacks** - Computer theft, BIOS modification, etc.
3. **Operating system exploits** - OS-level vulnerabilities
4. **Network attacks** - Man-in-the-middle (local-only by design)
5. **Social engineering** - Tricking users into running malicious code

## Security Implementation

### 1. File Access Control

**Goal:** Prevent unauthorized file access through directory traversal or bypasses.

**Implementation:**

```typescript
// Path normalization and validation
const normalizedPath = normalize(resolve(filePath));

// Whitelist checking
const isAllowed = config.allowedDirectories.some((allowedDir) => {
  const normalizedAllowed = normalize(resolve(allowedDir));
  return normalizedPath.startsWith(normalizedAllowed + "/");
});

// Type checking
if (!config.allowedExtensions.includes(extension)) {
  return false;
}
```

**Why:**

- `normalize()` - Removes `..` and `.` path components
- `resolve()` - Converts to absolute paths
- Directory whitelisting - Only specific directories are accessible
- Extension whitelist - Only markdown files are allowed
- Access permission checks - Uses OS-level permissions

**Testing:**

```bash
# Should be rejected (outside allowed dir)
POST /api/file/read
"../../../etc/passwd"

# Should be rejected (wrong extension)
POST /api/file/read
"/Users/you/file.txt"

# Should fail (permission denied)
POST /api/file/read
"/root/.ssh/id_rsa"
```

### 2. XSS Prevention

**Goal:** Prevent injection of malicious scripts through markdown content.

**Implementation:**

```javascript
// HTML escaping
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Use textContent instead of innerHTML where possible
element.textContent = userInput; // Safe
element.innerHTML = userInput; // Dangerous!
```

**Why:**

- `textContent` - Browser treats as plain text, escapes automatically
- No eval() - Never dynamically execute user code
- Content Security Policy - Restricts script execution origin
- Server-side sanitization - Removes null bytes and dangerous chars

**Markdown Rendering:**

- Server-side: Content is never parsed server-side
- Client-side: Only basic markdown parsing (no HTML parsing)
- Library handling: If using marked.js, ensure HTML is sanitized

### 3. Input Validation

**Goal:** Reject malformed or malicious input early.

**Implementation:**

```typescript
export function validateFilePathInput(input: unknown): string | null {
  // Type check
  if (typeof input !== "string") return null;

  // Length check
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;

  // Dangerous character check
  if (trimmed.includes("\0") || trimmed.includes("\n")) return null;

  return trimmed;
}
```

**Layers:**

1. Type validation - Ensure input is correct type
2. Length validation - Prevent extremely long paths
3. Character validation - Reject null bytes, newlines
4. Format validation - Path normalization catches issues

### 4. HTTP Security Headers

**Goal:** Prevent common browser-based attacks.

**Implementation:** Helmet.js with custom configuration

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
  })
);
```

**Headers Set:**

- `Content-Security-Policy` - Control resource loading
- `X-Frame-Options` - Prevent clickjacking
- `X-Content-Type-Options` - Prevent MIME sniffing
- `X-XSS-Protection` - XSS protection in older browsers
- `Strict-Transport-Security` - Force HTTPS (not applicable locally)

### 5. Rate Limiting

**Goal:** Prevent DoS attacks and abuse.

**Implementation:** In-memory rate limiting

```typescript
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // per minute

// Store records per IP, cleanup old entries
```

**Approach:**

- Per-IP tracking - Count requests by source IP
- Time window - 1-minute rolling window
- Cleanup - Removes expired entries to save memory
- Response - Returns 429 Too Many Requests

**Limitations:**

- In-memory only - Not suitable for cluster deployments
- IP-based - May not work behind proxies

### 6. Code Quality & Security Scanning

**Goal:** Catch security issues and bugs automatically.

**Tools:**

- **ESLint + security plugin** - Detects dangerous patterns
- **TypeScript strict mode** - Prevents many runtime errors
- **npm audit** - Checks dependency vulnerabilities
- **Pre-commit hooks** - Enforces checks before commits

**Examples Caught:**

```typescript
// ESLint would flag:
eval(userInput); // Security issue
const obj = {};
obj[userInput] = value; // Object injection risk
child_process.exec(userInput); // Command injection risk
```

### 7. Error Handling & Logging

**Goal:** Don't leak sensitive information in errors/logs.

**Implementation:**

```typescript
function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  const safeDetails = {
    ...details,
    filePath: "[REDACTED]",
    content: "[REDACTED]",
  };
  console.error(`[SECURITY] ${event}`, safeDetails);
}
```

**Approach:**

- Never log file paths
- Never log file content
- Log error types, not error messages that might contain paths
- Use `[REDACTED]` placeholders for security events

**Error Responses:**

```typescript
// Client receives generic error
res.status(500).json({ error: "Failed to read file" });

// Server logs detailed error
console.error("File read error:", actualError);
```

### 8. Environment Configuration

**Goal:** Keep secrets separate from code.

**Implementation:** `.env` file with defaults

```env
ALLOWED_DIRECTORIES=/Users/you/Documents,/Users/you/Projects
MAX_FILE_SIZE=5242880
PORT=3000
NODE_ENV=development
```

**Best Practices:**

- `.env` is in `.gitignore` - Never committed
- `.env.example` shows structure without secrets
- Validate on startup - Fail fast if misconfigured
- Type-safe config - TypeScript checks config structure

## Dependency Security

### Included Libraries

**Express.js**

- Well-maintained, widely used
- Regular security updates
- Known for good security practices

**Helmet.js**

- Specifically designed for HTTP security
- Sets recommended security headers
- Actively maintained

**marked.js**

- Popular markdown parser
- Configurable HTML rendering
- Consider using with DOMPurify for extra safety

**DOMPurify**

- Maintained by Cure53 (security firm)
- Specifically for XSS prevention
- Battle-tested on many websites

### Keeping Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update to latest versions
npm update

# Install latest major versions (breaking changes)
npm install express@latest

# Run security audit
npm audit

# Fix security issues automatically where possible
npm audit fix
```

### Vulnerability Reporting

When npm audit finds vulnerabilities:

1. **Understand the vulnerability**

   ```bash
   npm audit | grep -A 5 "CRITICAL\|HIGH"
   ```

2. **Check if it affects this app**

   - Is it in a production dependency?
   - Can it be triggered with local-only use?

3. **Update or patch**

   ```bash
   # Update affected package
   npm update vulnerable-package

   # If no fix available, use npm audit fix --force
   npm audit fix --force
   ```

## Security Testing

### Manual Testing Checklist

- [ ] Try path traversal: `../../etc/passwd`
- [ ] Try symlink following: load a symlink outside allowed dir
- [ ] Try JavaScript injection in markdown
- [ ] Try extremely long file paths
- [ ] Try null bytes in file path
- [ ] Try loading files without read permissions
- [ ] Try saving to files without write permissions
- [ ] Check Rate limiting: send 150 requests rapidly
- [ ] Check CSP headers in browser DevTools
- [ ] Verify no secrets in console logs

### Automated Testing

```bash
# Run all checks
npm run validate

# ESLint security plugin
npm run lint

# TypeScript strict mode
npm run type-check

# Dependency audit
npm run security:audit
```

## Deployment Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Review `ALLOWED_DIRECTORIES`
- [ ] Increase `MAX_FILE_SIZE` if needed
- [ ] Run `npm ci --production` (locked versions)
- [ ] Run `npm audit` before deploying
- [ ] Keep Node.js updated
- [ ] Monitor logs for security events
- [ ] Regular backups of important files
- [ ] Consider using process manager (PM2, systemd)

### Not Recommended

- ❌ Exposing to network (port forwarding)
- ❌ Using over unencrypted connection
- ❌ Running as root
- ❌ Disabling security checks
- ❌ Using in untrusted environments

## Security Audit Timeline

| Date       | Finding                | Resolution                             |
| ---------- | ---------------------- | -------------------------------------- |
| 2025-10-19 | Initial implementation | All core security features implemented |
| -          | -                      | -                                      |

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

**Questions or concerns? Please report security issues responsibly.**
