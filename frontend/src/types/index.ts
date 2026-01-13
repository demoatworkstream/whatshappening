export interface Prompt {
  text: string;
  commandType: number;
  createdAt?: string;
  timestamp?: number;
}

export interface Composer {
  composerId: string;
  name: string;
  createdAt: number;
  lastUpdatedAt: number;
  mode: string;
  workspaceId?: string;
  workspaceFolder?: string | null;
}

export interface WorkspaceSummary {
  id: string;
  folder: string | null;
  modified: string;
  modifiedTimestamp: number;
  promptCount: number;
  composerCount: number;
}

export interface Workspace extends WorkspaceSummary {
  prompts: Prompt[];
  composers: Composer[];
  composersByDate?: Record<string, Composer[]>;
}

export interface DateGroup {
  date: string;
  promptCount: number;
  composerCount: number;
  workspaceIds: string[];
}

export interface SelectedComposer {
  composer: Composer;
  workspaceName: string;
}

export interface Bubble {
  bubbleId: string;
  type: number; // 1 = user, 2 = assistant
  text: string;
  createdAt?: string;
}

export const PROMPT_TYPES: Record<number, { label: string; color: string }> = {
  1: { label: "Terminal", color: "terminal" },
  2: { label: "Chat", color: "chat" },
  4: { label: "Agent", color: "agent" },
};

export const MODE_LABELS: Record<string, { label: string; color: string }> = {
  agent: { label: "Agent", color: "agent" },
  chat: { label: "Chat", color: "chat" },
  edit: { label: "Edit", color: "terminal" },
};
