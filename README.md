# 🔍 What Is Going On?

A beautiful web UI to browse and explore your **Cursor AI** chat history.

![Screenshot](https://via.placeholder.com/800x450?text=Chat+Browser+Screenshot)

## Features

- 📅 **Date-based navigation** - Browse chats by date with conversation counts
- 💬 **Conversation viewer** - See full chat content with user/AI messages
- 📆 **Date separators** - Messages grouped by date with auto-scroll to selected day
- ✅ **Multi-select** - Select multiple conversations for export
- 📋 **Summary generation** - Generate markdown summaries with date filtering (Today/Yesterday/All)
- 🎨 **Beautiful UI** - Modern dark theme with smooth animations

## Quick Start

```bash
npx whatisgoingon
```

This will start the server and automatically open your browser to http://localhost:3456.

## Local Development

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd whatshappening

# Install dependencies
pnpm install
cd frontend && pnpm install && cd ..

# Build native dependencies (required for better-sqlite3)
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
cd -
```

### Testing Locally (with build - production mode)

```bash
# Build everything (server + frontend)
pnpm build

# Start the app
pnpm start
# or
node bin/cli.js
```

Then open http://localhost:3456 in your browser.

### Testing Locally (without build - development mode)

For hot-reload during development:

```bash
# Terminal 1: Start the backend server with auto-reload
pnpm dev:server

# Terminal 2: Start the frontend dev server
pnpm dev:frontend
```

Or run both simultaneously:

```bash
pnpm dev
```

- Backend runs on: http://localhost:3456
- Frontend dev server runs on: http://localhost:5173 (with API proxy to backend)

### Build Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build both server and frontend |
| `pnpm build:server` | Build only the TypeScript server |
| `pnpm build:frontend` | Build only the React frontend |
| `pnpm start` | Start the production server |
| `pnpm dev` | Start both servers in dev mode |
| `pnpm dev:server` | Start backend with hot-reload |
| `pnpm dev:frontend` | Start frontend with hot-reload |

## How It Works

This tool reads your local Cursor AI chat data from:

- **macOS**: `~/Library/Application Support/Cursor/User/workspaceStorage/`
- **Windows**: `%APPDATA%/Cursor/User/workspaceStorage/`
- **Linux**: `~/.config/Cursor/User/workspaceStorage/`

All data is processed locally - nothing is sent to any external server.

## Tech Stack

- **Backend**: Node.js, Express 5, better-sqlite3
- **Frontend**: React 19, Vite, Tailwind CSS v4, Base UI
- **CLI**: Node.js with open (for launching browser)

## Requirements

- Node.js 18+ (20.19+ or 22.12+ recommended for Vite)
- Cursor IDE installed (with some chat history)
- Build tools for native modules:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio Build Tools
  - **Linux**: `build-essential` package

## Publishing

To publish a new version to npm:

```bash
# Bump the version (patch/minor/major)
npm version patch

# Publish to npm (requires 2FA code)
npm publish --otp=YOUR_6_DIGIT_CODE
```

Or use the real npm command directly (if npm is aliased to pnpm):

```bash
command npm version patch
command npm publish --otp=YOUR_6_DIGIT_CODE
```

Version types:
- `patch` (1.0.0 → 1.0.1) - Bug fixes
- `minor` (1.0.0 → 1.1.0) - New features
- `major` (1.0.0 → 2.0.0) - Breaking changes

## Troubleshooting

### "No chats found"

This usually means Cursor is running and has locked the database files. The app should still work, but you may need to restart Cursor or wait a moment.

### Native module build errors

If you get errors about `better-sqlite3` bindings not found:

```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
```

## License

MIT
