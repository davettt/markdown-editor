# Markdown Editor & Live Previewer

A production-ready, security-first Node.js application for editing markdown files with a live split-pane preview. Edit markdown on the left, see rendered HTML on the right in real-time. Runs entirely on your local machine with zero external data transmission.

## Features

### Editor & Viewer

- ✅ **Split-pane interface** - Edit markdown on left, view rendered HTML on right
- ✅ **Live preview** - Preview updates in real-time as you type (debounced for performance)
- ✅ **Draft auto-save** - Browser local storage preserves unsaved work between sessions
- ✅ **File management** - Load, edit, and save markdown files directly from disk

### Security & Quality

- ✅ **Local-only operation** - All files stay on your computer; zero data sent externally
- ✅ **Secure file handling** - Path validation, directory whitelisting, XSS prevention
- ✅ **TypeScript** - Full type safety prevents common bugs
- ✅ **Security scanning** - ESLint security plugin + npm audit checks
- ✅ **Code quality** - Prettier formatting + ESLint with strict rules enforced

### User Experience

- ✅ **Responsive design** - Works on desktop, tablet, and mobile
- ✅ **Dark mode support** - Automatic system preference detection
- ✅ **Pre-commit hooks** - Code quality validated automatically (for developers)

## Security Features

This application is built with security as a top priority:

### File Access Security

- **Directory whitelisting** - Only allow access to specific directories
- **Path traversal prevention** - Normalize and validate all file paths
- **File type restrictions** - Only markdown files (`.md`, `.markdown`, `.txt`)
- **File size limits** - Prevent large file handling (configurable)
- **Access control** - File readability/writeability checks before operations

### Web Security

- **Helmet.js** - Security HTTP headers (CSP, X-Frame-Options, etc.)
- **XSS prevention** - HTML escaping for user content
- **CORS disabled** - Local-only by default (configurable)
- **Rate limiting** - Basic in-memory rate limiting
- **Input validation** - All API inputs validated and sanitized

### Code Security

- **ESLint security plugin** - Detects common security patterns
- **npm audit** - Dependency vulnerability scanning
- **No eval()** - Never uses dynamic code execution
- **Type safety** - TypeScript strict mode prevents common bugs
- **Safe logging** - Never logs sensitive paths or content

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

### Installation

```bash
# Clone or download the project
cd markdown-editor

# Install dependencies
npm install

# Setup pre-commit hooks
npx husky install

# Test the setup
npm run validate
```

### Configuration

Create a `.env` file based on `.env.example`:

```bash
# Copy template
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required configuration:**

```env
# Comma-separated list of absolute paths to allow
ALLOWED_DIRECTORIES=/Users/you/Documents,/Users/you/Projects

# Optional: Maximum file size in bytes (default: 5MB)
MAX_FILE_SIZE=5242880

# Server port (default: 3000)
PORT=3000

# Environment (development or production)
NODE_ENV=development
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Open in browser
# http://localhost:3000
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Run production build
npm start
```

## Usage

1. **Start the server**

   ```bash
   npm run dev
   ```

2. **Open in browser**

   - Navigate to `http://localhost:3000`

3. **Load a markdown file**

   - Enter the absolute file path (e.g., `/Users/you/Documents/note.md`)
   - Click "Load File"

4. **Edit and preview**

   - Left pane: Edit markdown
   - Right pane: Live preview updates as you type

5. **Save changes**

   - Click "Save File" when ready
   - Changes are written to the original file

6. **Draft recovery**
   - Browser automatically saves drafts to local storage
   - Drafts restored when you return to the editor

## Project Structure

```
markdown-editor/
├── src/
│   ├── server.ts           # Express server with security middleware
│   └── utils/
│       └── security.ts     # Path validation, sanitization, auth
├── public/
│   ├── index.html          # HTML interface
│   ├── style.css           # Responsive styling
│   └── app.js              # Frontend application logic
├── dist/                   # Compiled JavaScript (generated)
├── .husky/                 # Git pre-commit hooks
├── .env.example            # Configuration template
├── .editorconfig           # Editor settings
├── .eslintrc.js            # ESLint configuration with security plugin
├── .gitignore              # Git ignore rules
├── .lintstagedrc.json      # Lint-staged configuration
├── eslint.config.js        # ESLint flat config
├── package.json            # Dependencies and scripts
├── prettier.config.js      # Prettier formatter config
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Development Workflow

### Code Quality Commands

```bash
# Run all quality checks
npm run validate

# Type checking only
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Security audit
npm run security:audit
```

### Pre-commit Hooks

Pre-commit hooks run automatically before every git commit:

```
1. Type checking (tsc)
2. Linting (eslint) - must pass with zero warnings
3. Formatting check (prettier)
4. Security audit (npm audit)
```

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

### Making Changes

1. **Create a branch**

   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and test**

   ```bash
   npm run dev
   ```

3. **Run quality checks**

   ```bash
   npm run validate
   ```

4. **Commit (hooks run automatically)**
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

## Security Best Practices

### When Running This Application

1. **Only run on trusted machines** - This app is for local use only
2. **Keep Node.js updated** - Regular security patches are important
3. **Review ALLOWED_DIRECTORIES** - Only whitelist directories you need
4. **Don't expose to network** - Never port-forward this application
5. **Regular audits** - Run `npm audit` regularly and update dependencies

### For Contributors

1. **Follow code standards** - ESLint/Prettier enforce consistency
2. **Never commit credentials** - .env is in .gitignore
3. **Type everything** - TypeScript strict mode is enabled
4. **Validate all input** - Use security utilities for file paths
5. **Test security changes** - Run full validation suite
6. **Keep dependencies updated** - Run `npm audit` before committing

## API Reference

### POST /api/file/read

Load a markdown file from disk.

**Request:**

```json
"absolute/path/to/file.md"
```

**Response:**

```json
{
  "content": "# Hello\nMarkdown content...",
  "name": "file.md",
  "path": "absolute/path/to/file.md"
}
```

**Errors:**

- `400` - Invalid file path format
- `403` - Access denied (outside allowed directories)
- `500` - Server error

### POST /api/file/save

Save markdown content to a file.

**Request:**

```json
{
  "filePath": "absolute/path/to/file.md",
  "content": "# Hello\nMarkdown content..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "File saved successfully",
  "path": "absolute/path/to/file.md"
}
```

**Errors:**

- `400` - Invalid request format or content too large
- `403` - Access denied (outside allowed directories)
- `500` - Server error

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-10-19T10:30:00.000Z"
}
```

### GET /api/info

Application information.

**Response:**

```json
{
  "version": "1.0.0",
  "environment": "development",
  "sessionId": "uuid-string",
  "requestCount": 42
}
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### File Not Found

- Ensure the path is absolute (not relative)
- Verify the file exists: `ls -la /path/to/file`
- Check the directory is in ALLOWED_DIRECTORIES

### Permission Denied

- Check file permissions: `ls -la /path/to/file`
- Ensure user has read/write permissions
- On macOS, check System Preferences > Security & Privacy

### Preview Not Updating

- Clear browser cache (Cmd+Shift+R on macOS)
- Check browser console for errors (F12)
- Try refreshing the page

### Pre-commit Hooks Failing

```bash
# Run full validation to see what's wrong
npm run validate

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Try committing again
git add .
git commit -m "Your message"
```

## Performance Considerations

- **Large files** - Preview rendering is debounced (300ms) for performance
- **File size limit** - Set via MAX_FILE_SIZE environment variable
- **Rate limiting** - 100 requests per minute per IP
- **Memory** - In-memory rate limit store (cleaned periodically)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive design)

## License

MIT - See LICENSE file for details

## Future Enhancements

- [ ] Syntax highlighting with Prism.js
- [ ] Drag-and-drop file loading
- [ ] Multiple file tabs
- [ ] Auto-save with file watcher
- [ ] Search and replace
- [ ] Collaborative editing (with caution)
- [ ] Custom theme support
- [ ] Markdown export to HTML/PDF
- [ ] Keyboard shortcuts customization

## Usage & Forking

This is a **personal project** designed to be simple, self-contained, and easy to customize.

### For Users

1. Clone or fork this repository
2. Follow the **Quick Start** instructions
3. Configure `.env` for your directories
4. Run `npm run dev` and start editing

### For Customization

We encourage you to **fork this project** and modify it for your specific needs:

- Add features you want
- Change the UI/styling
- Adjust security settings for your use case
- Deploy to your own server (local recommended)

This is a "low-maintenance" project - you're welcome to use and modify it, but we don't accept pull requests or offer ongoing support. Fork it, customize it, make it yours!

## Security Reporting

If you discover a security vulnerability, please email directly rather than using issue tracker.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review GitHub Issues
3. Check existing discussions

---

**Built with security and developer experience in mind** 🔒
