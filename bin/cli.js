#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("\n🔍 What Is Going On? - Cursor AI Chat History Browser\n");

  const serverPath = join(__dirname, "..", "dist", "server.js");

  try {
    // Dynamic import the server module - this starts the server
    const serverModule = await import(serverPath);
    const PORT = serverModule.PORT || 3456;

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Open browser
    const open = (await import("open")).default;
    const url = `http://localhost:${PORT}`;

    console.log("📂 Opening browser...\n");
    console.log("Press Ctrl+C to stop the server\n");

    await open(url);

    // Keep the process alive - the server's listen() should do this,
    // but we add explicit signal handlers to be safe
    process.on("SIGINT", () => {
      console.log("\n👋 Shutting down server...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n👋 Shutting down server...");
      process.exit(0);
    });

    // Keep alive by preventing the event loop from exiting
    // The server.listen() should already do this, but just in case
    setInterval(() => {}, 1 << 30); // ~12 days interval - keeps process alive
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      console.error("❌ Error: Server not built.\n");
      console.error("If you cloned this repo, run:");
      console.error("  pnpm install && pnpm build\n");
    } else {
      console.error("Error starting server:", error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
