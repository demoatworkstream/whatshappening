import { useEffect, useRef } from 'react';
import type { Composer } from '../types';
import { useBubbles } from '../hooks/useApi';
import { formatDateTime, getModeInfo, getWorkspaceName } from '../lib/utils';

interface ConversationDetailProps {
  composer: Composer | null;
  selectedDate: string | null;
  onClose: () => void;
}

export function ConversationDetail({ composer, selectedDate, onClose }: ConversationDetailProps) {
  const { bubbles, loading } = useBubbles(composer?.composerId || null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayMarkerRef = useRef<HTMLDivElement>(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toLocaleDateString('en-CA');

  // Group bubbles by date
  const bubblesByDate = bubbles.reduce((acc, bubble) => {
    const date = bubble.createdAt 
      ? new Date(bubble.createdAt).toLocaleDateString('en-CA')
      : 'unknown';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(bubble);
    return acc;
  }, {} as Record<string, typeof bubbles>);

  // Sort dates
  const sortedDates = Object.keys(bubblesByDate).sort();

  // Auto-scroll to selected date's messages when loaded
  useEffect(() => {
    if (!loading && bubbles.length > 0 && scrollContainerRef.current) {
      // Find the marker for the selected date (or today)
      const targetDate = selectedDate || today;
      const marker = scrollContainerRef.current.querySelector(`[data-date="${targetDate}"]`);
      
      if (marker) {
        marker.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // If no messages from target date, scroll to bottom (most recent)
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [loading, bubbles.length, selectedDate, today]);

  if (!composer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted py-10">
        <span className="text-4xl opacity-50">💬</span>
        <span className="mt-3 text-sm font-medium text-text-secondary">
          Select a conversation
        </span>
        <span className="text-xs">Click on a conversation to view its content</span>
      </div>
    );
  }

  const mode = getModeInfo(composer.mode);
  const workspaceName = composer.workspaceFolder
    ? getWorkspaceName(composer.workspaceFolder, composer.workspaceId || '')
    : 'Unknown workspace';

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'unknown') return 'Unknown date';
    if (dateStr === today) return '📅 Today';
    
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    if (dateStr === yesterday) return '📆 Yesterday';
    
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-secondary shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
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
              {formatDateTime(composer.lastUpdatedAt)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="font-medium text-text-primary line-clamp-2">{composer.name}</div>
        <div className="text-xs text-text-muted mt-1">📁 {workspaceName}</div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent-primary" />
          </div>
        ) : bubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-muted">
            <span className="text-3xl opacity-50">📭</span>
            <span className="mt-2 text-sm">No messages found</span>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              {/* Date separator */}
              <div 
                data-date={date}
                ref={date === (selectedDate || today) ? todayMarkerRef : undefined}
                className={`sticky top-0 z-10 flex items-center justify-center py-2 mb-4 ${
                  date === (selectedDate || today) ? '' : ''
                }`}
              >
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  date === today
                    ? 'bg-success text-white'
                    : date === selectedDate
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-tertiary text-text-muted border border-border'
                }`}>
                  {formatDateLabel(date)}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-4">
                {bubblesByDate[date].map((bubble) => (
                  <div
                    key={bubble.bubbleId}
                    className={`rounded-xl p-4 ${
                      bubble.type === 1
                        ? 'bg-accent-primary/10 border border-accent-primary/30 ml-8'
                        : 'bg-bg-secondary border border-border mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          bubble.type === 1
                            ? 'bg-accent-primary/20 text-accent-secondary'
                            : 'bg-terminal/15 text-terminal'
                        }`}
                      >
                        {bubble.type === 1 ? '👤 You' : '🤖 AI'}
                      </span>
                      {bubble.createdAt && (
                        <span className="text-[10px] text-text-muted">
                          {new Date(bubble.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm text-text-secondary whitespace-pre-wrap break-words leading-relaxed">
                      {bubble.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-bg-secondary shrink-0">
        <div className="text-xs text-text-muted">
          {bubbles.length} messages · {sortedDates.length} day{sortedDates.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
