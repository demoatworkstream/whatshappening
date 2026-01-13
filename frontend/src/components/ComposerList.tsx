import { Checkbox } from '@base-ui/react/checkbox';
import type { Composer } from '../types';
import { formatTime, getModeInfo, getWorkspaceName } from '../lib/utils';

interface ComposerListProps {
  composers: Composer[];
  isSelected: (composerId: string) => boolean;
  onToggle: (composer: Composer, workspaceName: string) => void;
  onSelectAll: () => void;
  loading: boolean;
  showWorkspace?: boolean;
  activeComposerId?: string;
}

export function ComposerList({
  composers,
  isSelected,
  onToggle,
  loading,
  showWorkspace = false,
  activeComposerId,
}: ComposerListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent-primary" />
      </div>
    );
  }

  if (composers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted py-10">
        <span className="text-4xl opacity-50">💭</span>
        <span className="mt-3 text-sm font-medium text-text-secondary">No conversations found</span>
        <span className="text-xs">Select a different date to view conversations</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {composers.map((composer) => {
        const mode = getModeInfo(composer.mode);
        const selected = isSelected(composer.composerId);
        const isActive = activeComposerId === composer.composerId;
        const workspaceName = composer.workspaceFolder 
          ? getWorkspaceName(composer.workspaceFolder, composer.workspaceId || '')
          : 'Unknown workspace';

        return (
          <button
            key={composer.composerId}
            onClick={() => onToggle(composer, workspaceName)}
            className={`w-full text-left rounded-lg p-3 border transition-all ${
              isActive
                ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary/50'
                : selected
                ? 'border-success bg-success-bg'
                : 'border-border bg-bg-secondary hover:border-accent-primary/50 hover:bg-bg-tertiary'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide ${
                  mode.color === 'terminal'
                    ? 'bg-terminal/15 text-terminal'
                    : mode.color === 'agent'
                    ? 'bg-agent/15 text-agent'
                    : 'bg-chat/15 text-chat'
                }`}
              >
                {mode.label}
              </span>
              <span className="text-xs text-text-muted">
                {formatTime(composer.lastUpdatedAt)}
              </span>
              <div className="ml-auto">
                <Checkbox.Root
                  checked={selected}
                  onCheckedChange={() => onToggle(composer, workspaceName)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-5 w-5 items-center justify-center rounded border border-border bg-bg-tertiary data-[checked]:bg-success data-[checked]:border-success"
                >
                  <Checkbox.Indicator className="text-white text-xs">✓</Checkbox.Indicator>
                </Checkbox.Root>
              </div>
            </div>
            
            <div className="font-medium text-sm text-text-primary mb-1 line-clamp-2">
              {composer.name}
            </div>
            
            {showWorkspace && (
              <div className="text-xs text-text-muted truncate">
                📁 {workspaceName}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

