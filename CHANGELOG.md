# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-19

### Added

- Initial release of Markdown Editor
- Local-only markdown editing with live preview
- Secure file handling with directory whitelisting
- Path traversal attack prevention
- XSS prevention and HTML escaping
- Rate limiting (100 requests/minute per IP)
- Security HTTP headers via Helmet.js
- TypeScript full type safety
- ESLint with security plugin
- Prettier code formatting
- Pre-commit hooks for code quality
- File size limits (configurable, default 5MB)
- File type restrictions (markdown, text files only)
- Draft preservation via browser local storage
- Responsive design with dark mode support
- Comprehensive API documentation
- Security architecture documentation
- MIT License
- Development setup guide

### Security Features

- Directory whitelisting for file access
- Absolute path validation
- Extension whitelist (.md, .markdown, .txt)
- OS-level permission checks
- Input validation for all API inputs
- Content sanitization to remove dangerous characters
- CORS disabled by default
- Safe error logging (redacted sensitive paths)
- Dependency vulnerability scanning (npm audit)

### Development Features

- Hot reload development server
- TypeScript strict mode
- ESLint security scanning
- npm audit integration
- Prettier automatic formatting
- Husky pre-commit hooks
- lint-staged for staged files only

---

## Release Guidelines

When creating a new release:

1. **Update version** in `src/version.ts`
2. **Update CHANGELOG.md** with new features/fixes/security updates
3. **Commit with message**: `chore: release v1.x.x`
4. **Create git tag**: `git tag -a v1.x.x -m "Release version 1.x.x"`
5. **Push to remote**: `git push && git push --tags`

### Version Format

- **Major.Minor.Patch** (semantic versioning)
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes, security patches

### Changelog Sections

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Previously deprecated features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes
