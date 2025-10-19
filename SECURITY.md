# Security Considerations

## Important: Local-Only Use

This application is **designed for local-only operation** on a trusted machine. It is **not** designed for:

- Public internet deployment
- Multi-user environments
- Untrusted networks
- Production servers handling sensitive data

If you deploy this beyond `localhost`, you assume all associated risks.

---

## What We Protect Against

This application implements protections for realistic local-use scenarios:

### 1. File Access Control

**Threat:** Accidentally or maliciously reading/writing files outside intended directories

**Protection:**

- Directory whitelisting - Only specific directories are accessible
- Path normalization - `../../../etc/passwd` attacks are blocked
- Extension whitelist - Only `.md`, `.markdown`, `.txt` files allowed
- OS-level permission checks - System enforces read/write permissions

**How to use safely:**

- Set `ALLOWED_DIRECTORIES` in `.env` to only directories you want to edit
- Review your `.env` configuration before running the app

### 2. XSS Prevention

**Threat:** Malicious markdown or HTML injection when rendering content

**Protection:**

- Content sanitization - Removes null bytes and dangerous characters
- HTML escaping - Text content is never interpreted as HTML
- No eval() - Never executes dynamic code
- CSP headers - Browser restricts script sources to same-origin

**Example:** If markdown contains `<script>alert('xss')</script>`, it renders as literal text, not executable code.

### 3. Credential Protection

**Threat:** Accidentally committing `.env` file with local paths or configuration

**Protection:**

- `.env` is in `.gitignore` - Never committed to git
- `.env.example` contains only placeholders - Shows structure without secrets
- Environment validation - App fails fast if misconfigured

**How to use safely:**

- Never commit `.env` file
- Use `.env.example` as a template
- Check `git status` before committing to verify no `.env` is staged

### 4. Dependency Vulnerabilities

**Threat:** Using packages with known security vulnerabilities

**Protection:**

- npm audit - Checks dependencies for known vulnerabilities
- Pre-commit hooks - Runs audit before commits
- Regular updates - Dependencies are up-to-date

**How to use safely:**

- Run `npm audit` regularly
- Update packages with `npm update`
- Review changes before upgrading major versions

---

## What We Don't Protect Against

These threats are **out of scope** for a local application:

- **Local privilege escalation** - If attacker has shell access, they already have file access
- **Physical attacks** - Computer theft, BIOS modification, etc.
- **OS exploits** - Operating system vulnerabilities (update your OS instead)
- **Network attacks** - Man-in-the-middle, DDoS (app is local-only by design)
- **User mistakes** - Configuring `ALLOWED_DIRECTORIES` to `/` or root
- **Malicious markdown** - If you load untrusted `.md` files, review them first

---

## Usage Checklist

Before using this application:

- [ ] You trust the machine it runs on
- [ ] You understand it's local-only
- [ ] You've configured `.env` with appropriate directories
- [ ] You keep Node.js and dependencies updated
- [ ] You don't commit `.env` file
- [ ] You understand `.claude/` is local-only (not committed)

---

## If You Deploy This Elsewhere

If you ignore the "local-only" warning and deploy this:

**You must:**

- Run as non-root user
- Use HTTPS only (set up reverse proxy)
- Implement authentication (not included)
- Run behind a firewall
- Set `NODE_ENV=production`
- Monitor logs for security events
- Keep all dependencies updated

**You shouldn't:**

- Expose the app directly to the internet
- Assume the provided rate limiting is sufficient
- Assume path validation alone prevents all attacks
- Use this for multi-user scenarios

**Recommendation:** Don't do this. This tool is meant for local use. If you need a web-based editor, use a dedicated solution designed for that.

---

## Reporting Security Issues

If you find a security issue **in this local tool**:

1. Report it privately (don't use public issues)
2. Email details to the maintainer
3. Include steps to reproduce
4. Wait for response before public disclosure

For most issues in a local app, the fix is: "Don't run untrusted code on your machine" or "Configure `.env` correctly."

---

## Summary

This is a **well-intentioned local tool** with reasonable security practices, not a hardened production application. Use it locally, fork it, customize it. If you need something more, use a purpose-built solution.

**Use at your own risk.** 🔒
