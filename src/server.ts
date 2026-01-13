import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json());

// Serve static files from built frontend
const staticPath = path.join(import.meta.dirname, 'public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
}

interface Prompt {
  text: string;
  commandType: number;
  createdAt?: string; // ISO timestamp if available
  timestamp?: number; // Unix timestamp if available
}

interface Composer {
  composerId: string;
  name: string;
  createdAt: number;
  lastUpdatedAt: number;
  mode: string;
}

interface Bubble {
  bubbleId: string;
  type: number; // 1 = user, 2 = assistant
  text: string;
  createdAt?: string;
}

interface Workspace {
  id: string;
  path: string;
  folder: string | null;
  modified: string;
  modifiedTimestamp: number;
  promptCount: number;
  prompts: Prompt[];
  composers: Composer[];
}

function getCursorStoragePath(): string {
  const home = os.homedir();
  
  if (process.platform === 'win32') {
    return path.join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'workspaceStorage');
  } else if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage');
  } else {
    return path.join(home, '.config', 'Cursor', 'User', 'workspaceStorage');
  }
}

function getGlobalStoragePath(): string {
  const home = os.homedir();
  
  if (process.platform === 'win32') {
    return path.join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  } else if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  } else {
    return path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  }
}

function getWorkspaceFolder(workspaceDir: string): string | null {
  try {
    // First try to read from workspace.json file
    const workspaceJsonPath = path.join(workspaceDir, 'workspace.json');
    if (fs.existsSync(workspaceJsonPath)) {
      const content = fs.readFileSync(workspaceJsonPath, 'utf-8');
      const data = JSON.parse(content);
      if (data?.folder) {
        // Convert file:// URI to path
        return data.folder.replace('file://', '').replace(/%20/g, ' ');
      }
    }
    
    // Fallback: try to read from database
    const dbPath = path.join(workspaceDir, 'state.vscdb');
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      const result = db.prepare("SELECT value FROM ItemTable WHERE key LIKE '%folder%' LIMIT 1").get() as { value: string } | undefined;
      db.close();
      
      if (result?.value) {
        try {
          const data = JSON.parse(result.value);
          if (typeof data === 'string') return data;
          if (data?.uri) return data.uri.replace('file://', '');
        } catch {
          return result.value.substring(0, 100);
        }
      }
    }
  } catch {
    // Error reading files
  }
  return null;
}

function extractPrompts(dbPath: string): Prompt[] {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const result = db.prepare("SELECT value FROM ItemTable WHERE key = 'aiService.prompts'").get() as { value: string } | undefined;
    db.close();
    
    if (result?.value) {
      const data = JSON.parse(result.value);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Database locked or parsing error
  }
  return [];
}

function extractComposers(dbPath: string): Composer[] {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const result = db.prepare("SELECT value FROM ItemTable WHERE key = 'composer.composerData'").get() as { value: string } | undefined;
    db.close();
    
    if (result?.value) {
      const data = JSON.parse(result.value);
      if (data?.allComposers && Array.isArray(data.allComposers)) {
        return data.allComposers
          .filter((c: any) => {
            // Filter out composers without valid timestamps
            return c.composerId && 
                   typeof c.lastUpdatedAt === 'number' && 
                   c.lastUpdatedAt > 0;
          })
          .map((c: any) => ({
            composerId: c.composerId,
            name: c.name || `Chat ${new Date(c.createdAt || c.lastUpdatedAt).toLocaleString()}`,
            createdAt: c.createdAt || c.lastUpdatedAt,
            lastUpdatedAt: c.lastUpdatedAt,
            mode: c.unifiedMode || 'chat',
          }));
      }
    }
  } catch {
    // Database locked or parsing error
  }
  return [];
}

function listWorkspaces(daysBack: number = 30): Workspace[] {
  const storagePath = getCursorStoragePath();
  const workspaces: Workspace[] = [];
  const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  if (!fs.existsSync(storagePath)) {
    return workspaces;
  }
  
  const dirs = fs.readdirSync(storagePath);
  
  for (const dir of dirs) {
    const workspaceDir = path.join(storagePath, dir);
    const dbPath = path.join(workspaceDir, 'state.vscdb');
    
    if (!fs.existsSync(dbPath)) continue;
    
    const stats = fs.statSync(dbPath);
    const modifiedTimestamp = stats.mtimeMs;
    
    if (modifiedTimestamp < cutoffDate) continue;
    
    const folder = getWorkspaceFolder(workspaceDir);
    const prompts = extractPrompts(dbPath);
    const composers = extractComposers(dbPath);
    
    if (prompts.length > 0 || composers.length > 0) {
      workspaces.push({
        id: dir,
        path: dbPath,
        folder,
        modified: new Date(modifiedTimestamp).toISOString(),
        modifiedTimestamp,
        promptCount: prompts.length,
        prompts,
        composers,
      });
    }
  }
  
  // Sort by modification date (most recent first)
  workspaces.sort((a, b) => b.modifiedTimestamp - a.modifiedTimestamp);
  return workspaces;
}

// API Routes
app.get('/api/workspaces', (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const workspaces = listWorkspaces(days);
  
  // Return without full prompts for listing
  const summary = workspaces.map(ws => ({
    id: ws.id,
    folder: ws.folder,
    modified: ws.modified,
    modifiedTimestamp: ws.modifiedTimestamp,
    promptCount: ws.promptCount,
    composerCount: ws.composers.length,
  }));
  
  res.json(summary);
});

app.get('/api/workspaces/:id', (req, res) => {
  const filterDate = req.query.date as string; // YYYY-MM-DD format
  const workspaces = listWorkspaces(365);
  const workspace = workspaces.find(ws => ws.id === req.params.id);
  
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  
  // If a date filter is provided, filter composers by that date
  let filteredComposers = workspace.composers;
  if (filterDate) {
    const startOfDay = new Date(filterDate + 'T00:00:00').getTime();
    const endOfDay = new Date(filterDate + 'T23:59:59.999').getTime();
    
    filteredComposers = workspace.composers.filter(c => {
      // Include if lastUpdatedAt falls on the selected date
      return c.lastUpdatedAt >= startOfDay && c.lastUpdatedAt <= endOfDay;
    });
  }
  
  res.json({
    ...workspace,
    composers: filteredComposers,
    // Also include composers grouped by date for the UI
    composersByDate: groupComposersByDate(workspace.composers),
  });
});

function groupComposersByDate(composers: Composer[]): Record<string, Composer[]> {
  const grouped: Record<string, Composer[]> = {};
  
  for (const composer of composers) {
    const date = new Date(composer.lastUpdatedAt).toLocaleDateString('en-CA');
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(composer);
  }
  
  return grouped;
}

app.get('/api/dates', (req, res) => {
  const workspaces = listWorkspaces(30);
  
  // Group by date based on composer activity, not just workspace modification
  const dates = new Map<string, { promptCount: number; workspaces: Set<string>; composerCount: number }>();
  
  for (const ws of workspaces) {
    // Add based on workspace modification date (legacy prompts)
    const wsDate = new Date(ws.modifiedTimestamp).toLocaleDateString('en-CA');
    if (!dates.has(wsDate)) {
      dates.set(wsDate, { promptCount: 0, workspaces: new Set(), composerCount: 0 });
    }
    
    // Group composers by their actual lastUpdatedAt date
    for (const composer of ws.composers) {
      const composerDate = new Date(composer.lastUpdatedAt).toLocaleDateString('en-CA');
      if (!dates.has(composerDate)) {
        dates.set(composerDate, { promptCount: 0, workspaces: new Set(), composerCount: 0 });
      }
      const entry = dates.get(composerDate)!;
      entry.workspaces.add(ws.id);
      entry.composerCount++;
    }
    
    // Also add prompts to workspace mod date
    const wsEntry = dates.get(wsDate)!;
    wsEntry.promptCount += ws.promptCount;
    wsEntry.workspaces.add(ws.id);
  }
  
  const result = Array.from(dates.entries())
    .filter(([, data]) => data.composerCount > 0) // Only include dates with actual conversations
    .map(([date, data]) => ({
      date,
      promptCount: data.promptCount,
      composerCount: data.composerCount,
      workspaceIds: Array.from(data.workspaces),
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending
  
  res.json(result);
});

app.get('/api/composers', (req, res) => {
  const filterDate = req.query.date as string; // YYYY-MM-DD format
  const workspaces = listWorkspaces(30);
  
  const allComposers: Array<Composer & { workspaceId: string; workspaceFolder: string | null }> = [];
  
  for (const ws of workspaces) {
    for (const composer of ws.composers) {
      const composerDate = new Date(composer.lastUpdatedAt).toLocaleDateString('en-CA');
      
      // If date filter provided, only include composers from that date
      if (filterDate && composerDate !== filterDate) {
        continue;
      }
      
      allComposers.push({
        ...composer,
        workspaceId: ws.id,
        workspaceFolder: ws.folder,
      });
    }
  }
  
  // Sort by lastUpdatedAt descending
  allComposers.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
  
  res.json(allComposers);
});

// Get bubbles (chat messages) for a specific composer
app.get('/api/composers/:composerId/bubbles', (req, res) => {
  const { composerId } = req.params;
  
  try {
    const globalDbPath = getGlobalStoragePath();
    if (!fs.existsSync(globalDbPath)) {
      return res.json([]);
    }
    
    const db = new Database(globalDbPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare(
      "SELECT key, value FROM cursorDiskKV WHERE key LIKE ?"
    ).all(`bubbleId:${composerId}:%`) as { key: string; value: string }[];
    db.close();
    
    const bubbles: Bubble[] = [];
    
    for (const row of rows) {
      try {
        const data = JSON.parse(row.value);
        const bubbleId = row.key.split(':')[2];
        
        // Only include bubbles with text content
        if (data.text) {
          bubbles.push({
            bubbleId,
            type: data.type || 0, // 1 = user, 2 = assistant
            text: data.text,
            createdAt: data.createdAt,
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }
    
    // Sort by createdAt if available
    bubbles.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });
    
    res.json(bubbles);
  } catch (error) {
    console.error('Error fetching bubbles:', error);
    res.json([]);
  }
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  if (!query) {
    return res.json([]);
  }
  
  const workspaces = listWorkspaces(30);
  const results: Array<{ workspace: string; folder: string | null; prompt: Prompt }> = [];
  
  for (const ws of workspaces) {
    for (const prompt of ws.prompts) {
      if (prompt.text?.toLowerCase().includes(query)) {
        results.push({
          workspace: ws.id,
          folder: ws.folder,
          prompt
        });
      }
    }
  }
  
  res.json(results.slice(0, 100)); // Limit to 100 results
});

// Serve frontend - handle SPA routing
app.get('/', (req, res) => {
  const indexPath = path.join(import.meta.dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run "pnpm build" first.');
  }
});

// Fallback for SPA client-side routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(import.meta.dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔍 What Is Going On? - Cursor Chat History Browser      ║
║                                                           ║
║   Server running at:                                      ║
║   → http://localhost:${PORT}                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
});

export { app, server, PORT };
