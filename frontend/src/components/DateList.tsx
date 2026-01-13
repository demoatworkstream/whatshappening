import type { DateGroup } from '../types';
import { formatDate } from '../lib/utils';

interface DateListProps {
  dates: DateGroup[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  loading: boolean;
}

export function DateList({ dates, selectedDate, onSelectDate, loading }: DateListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent-primary" />
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-text-muted">
        <span className="text-3xl opacity-50">📭</span>
        <span className="mt-2 text-sm">No chats found</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {dates.map((d) => (
        <button
          key={d.date}
          onClick={() => onSelectDate(d.date)}
          className={`w-full rounded-lg px-3 py-3 text-left transition-all hover:bg-bg-hover ${
            selectedDate === d.date
              ? 'border border-accent-primary bg-gradient-to-r from-accent-primary/15 to-agent/10'
              : 'border border-transparent'
          }`}
        >
          <div className="font-medium text-sm text-text-primary">{formatDate(d.date)}</div>
          <div className="mt-1 text-xs text-text-muted">
            {d.composerCount} conversation{d.composerCount !== 1 ? 's' : ''} · {d.workspaceIds.length} workspace{d.workspaceIds.length !== 1 ? 's' : ''}
          </div>
        </button>
      ))}
    </div>
  );
}
