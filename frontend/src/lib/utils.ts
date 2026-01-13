import { MODE_LABELS, type SelectedComposer } from '../types';

export function getWorkspaceName(folder: string | null, id: string): string {
  if (folder) {
    return folder.split('/').pop() || folder;
  }
  return id.substring(0, 12) + '...';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

  if (dateStr === today) return '📅 Today';
  if (dateStr === yesterday) return '📆 Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(timestamp: number | string): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getModeInfo(mode: string) {
  return MODE_LABELS[mode] || { label: 'Chat', color: 'chat' };
}

export function generateSummaryMarkdown(selections: [string, SelectedComposer][]): string {
  const grouped = new Map<string, SelectedComposer[]>();

  selections.forEach(([, item]) => {
    if (!grouped.has(item.workspaceName)) {
      grouped.set(item.workspaceName, []);
    }
    grouped.get(item.workspaceName)!.push(item);
  });

  let text = '# Selected Conversations\n\n';
  
  grouped.forEach((items, workspace) => {
    text += `## 📁 ${workspace}\n\n`;
    items.forEach((item) => {
      const mode = getModeInfo(item.composer.mode).label;
      const time = formatDateTime(item.composer.lastUpdatedAt);
      text += `### ${item.composer.name}\n`;
      text += `- **Mode:** ${mode}\n`;
      text += `- **Last Updated:** ${time}\n`;
      text += `- **ID:** \`${item.composer.composerId}\`\n\n`;
    });
    text += '---\n\n';
  });

  return text;
}
