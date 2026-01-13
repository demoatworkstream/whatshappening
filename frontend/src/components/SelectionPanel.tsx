import { Dialog } from '@base-ui/react/dialog';
import { useState, useEffect, useMemo } from 'react';
import type { SelectedComposer, Bubble } from '../types';
import { getModeInfo, formatDateTime } from '../lib/utils';

interface SelectionPanelProps {
  selections: [string, SelectedComposer][];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

interface ConversationWithBubbles {
  composer: SelectedComposer;
  bubbles: Bubble[];
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'custom';

function filterBubblesByDate(bubbles: Bubble[], filter: DateFilter, customDate?: string): Bubble[] {
  if (filter === 'all') return bubbles;
  
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  
  let targetDate: string;
  if (filter === 'today') {
    targetDate = today;
  } else if (filter === 'yesterday') {
    targetDate = yesterday;
  } else if (filter === 'custom' && customDate) {
    targetDate = customDate;
  } else {
    return bubbles;
  }
  
  return bubbles.filter(bubble => {
    if (!bubble.createdAt) return false;
    const bubbleDate = new Date(bubble.createdAt).toLocaleDateString('en-CA');
    return bubbleDate === targetDate;
  });
}

function generateFilteredSummary(
  conversations: ConversationWithBubbles[], 
  filter: DateFilter,
  customDate?: string
): string {
  const filterLabel = filter === 'all' ? 'All Dates' : 
                      filter === 'today' ? 'Today Only' : 
                      filter === 'yesterday' ? 'Yesterday Only' : 
                      customDate || 'Selected Date';

  const grouped = new Map<string, ConversationWithBubbles[]>();

  // Filter bubbles and only include conversations with messages
  const filteredConversations = conversations.map(conv => ({
    ...conv,
    bubbles: filterBubblesByDate(conv.bubbles, filter, customDate)
  })).filter(conv => conv.bubbles.length > 0 || filter === 'all');

  filteredConversations.forEach((conv) => {
    const workspace = conv.composer.workspaceName;
    if (!grouped.has(workspace)) {
      grouped.set(workspace, []);
    }
    grouped.get(workspace)!.push(conv);
  });

  let text = '# Chat History Summary\n\n';
  text += `> Generated on ${new Date().toLocaleString()}\n`;
  text += `> Filter: **${filterLabel}**\n\n`;
  text += `**Total Conversations:** ${filteredConversations.length}\n\n`;
  text += '---\n\n';

  grouped.forEach((items, workspace) => {
    text += `## 📁 ${workspace}\n\n`;
    items.forEach((item) => {
      const mode = getModeInfo(item.composer.composer.mode).label;
      const time = formatDateTime(item.composer.composer.lastUpdatedAt);
      text += `### ${item.composer.composer.name}\n`;
      text += `**Mode:** ${mode} | **Last Updated:** ${time}\n\n`;

      if (item.bubbles.length > 0) {
        item.bubbles.forEach((bubble) => {
          const role = bubble.type === 1 ? '👤 **User:**' : '🤖 **AI:**';
          text += `${role}\n\n`;
          text += `${bubble.text}\n\n`;
        });
      } else {
        text += `*No messages found for this filter*\n\n`;
      }
      text += '---\n\n';
    });
  });

  return text;
}

export function SelectionPanel({ selections, onRemove, onClearAll }: SelectionPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<ConversationWithBubbles[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Fetch all bubbles when modal opens
  useEffect(() => {
    if (showModal && selections.length > 0) {
      setLoading(true);

      const fetchAllBubbles = async () => {
        const results: ConversationWithBubbles[] = [];

        for (const [, data] of selections) {
          try {
            const res = await fetch(`/api/composers/${data.composer.composerId}/bubbles`);
            const bubbles = await res.json();
            results.push({ composer: data, bubbles });
          } catch (e) {
            results.push({ composer: data, bubbles: [] });
          }
        }

        setSummaryData(results);
        setLoading(false);
      };

      fetchAllBubbles();
    }
  }, [showModal, selections]);

  // Filter data based on selected date filter
  const filteredData = useMemo(() => {
    return summaryData.map(conv => ({
      ...conv,
      bubbles: filterBubblesByDate(conv.bubbles, dateFilter)
    }));
  }, [summaryData, dateFilter]);

  // Generate summary text based on filter
  const summaryText = useMemo(() => {
    return generateFilteredSummary(summaryData, dateFilter);
  }, [summaryData, dateFilter]);

  // Count messages for each filter option
  const messageCounts = useMemo(() => {
    const all = summaryData.reduce((acc, c) => acc + c.bubbles.length, 0);
    const todayCount = summaryData.reduce((acc, c) => 
      acc + filterBubblesByDate(c.bubbles, 'today').length, 0);
    const yesterdayCount = summaryData.reduce((acc, c) => 
      acc + filterBubblesByDate(c.bubbles, 'yesterday').length, 0);
    return { all, today: todayCount, yesterday: yesterdayCount };
  }, [summaryData]);

  const handleCopy = async () => {
    if (summaryText) {
      await navigator.clipboard.writeText(summaryText);
      alert(`Copied ${selections.length} conversations to clipboard!`);
    } else {
      const quickSummary = selections.map(([, data]) =>
        `- ${data.composer.name} (${data.workspaceName})`
      ).join('\n');
      await navigator.clipboard.writeText(`# Selected Conversations\n\n${quickSummary}`);
      alert(`Copied ${selections.length} conversation titles to clipboard!`);
    }
  };

  const handleCopyFromModal = async () => {
    await navigator.clipboard.writeText(summaryText);
    alert('Copied to clipboard!');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <span>✅ Selected</span>
          <span className="bg-success text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            {selections.length}
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary transition-all"
        >
          Clear All
        </button>
      </div>

      {/* Selection List */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {selections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted py-10">
            <span className="text-3xl opacity-50">📋</span>
            <span className="mt-2 text-sm font-medium text-text-secondary">No selections yet</span>
            <span className="text-xs">Click on conversations to select them</span>
          </div>
        ) : (
          <div className="space-y-2">
            {selections.map(([key, data]) => {
              const mode = getModeInfo(data.composer.mode);

              return (
                <div
                  key={key}
                  className="relative p-3 bg-bg-tertiary rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${mode.color === 'terminal'
                        ? 'bg-terminal/15 text-terminal'
                        : mode.color === 'agent'
                          ? 'bg-agent/15 text-agent'
                          : 'bg-chat/15 text-chat'
                        }`}
                    >
                      {mode.label}
                    </span>
                    <span className="text-[10px] text-text-muted truncate flex-1">
                      {data.workspaceName}
                    </span>
                    <button
                      onClick={() => onRemove(key)}
                      className="text-text-muted hover:text-danger transition-colors text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="font-medium text-xs text-text-primary line-clamp-2 mb-1">
                    {data.composer.name}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {formatDateTime(data.composer.lastUpdatedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2 shrink-0">
        <button
          onClick={() => setShowModal(true)}
          disabled={selections.length === 0}
          className="w-full py-2 px-4 rounded-lg bg-success text-white font-medium text-sm hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          📋 View Summary
        </button>
        <button
          onClick={handleCopy}
          disabled={selections.length === 0}
          className="w-full py-2 px-4 rounded-lg bg-accent-primary text-white font-medium text-sm hover:bg-accent-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          📎 Copy to Clipboard
        </button>
      </div>

      {/* Summary Modal */}
      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl max-h-[85vh] bg-bg-secondary rounded-2xl border border-border z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <Dialog.Title className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <span className="text-lg font-semibold">📋 Conversation Summary</span>
                <div className="text-xs text-text-muted mt-1">
                  {selections.length} conversation{selections.length !== 1 ? 's' : ''} selected
                </div>
              </div>
              <Dialog.Close className="text-text-muted hover:text-text-primary text-2xl leading-none">
                ×
              </Dialog.Close>
            </Dialog.Title>

            {/* Date Filter Toggle */}
            <div className="px-6 py-3 border-b border-border bg-bg-tertiary shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-muted font-medium">Show messages from:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      dateFilter === 'all'
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-secondary text-text-secondary border border-border hover:bg-bg-hover'
                    }`}
                  >
                    All Dates
                    <span className="ml-1 opacity-70">({messageCounts.all})</span>
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    disabled={messageCounts.today === 0}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      dateFilter === 'today'
                        ? 'bg-success text-white'
                        : 'bg-bg-secondary text-text-secondary border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    📅 Today
                    <span className="ml-1 opacity-70">({messageCounts.today})</span>
                  </button>
                  <button
                    onClick={() => setDateFilter('yesterday')}
                    disabled={messageCounts.yesterday === 0}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      dateFilter === 'yesterday'
                        ? 'bg-agent text-white'
                        : 'bg-bg-secondary text-text-secondary border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    📆 Yesterday
                    <span className="ml-1 opacity-70">({messageCounts.yesterday})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="h-10 w-10 animate-spin rounded-full border-3 border-border border-t-accent-primary" />
                  <div className="mt-4 text-text-muted text-sm">Loading conversations...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredData.filter(conv => conv.bubbles.length > 0 || dateFilter === 'all').map((conv, idx) => (
                    <div key={idx} className="bg-bg-tertiary rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase ${getModeInfo(conv.composer.composer.mode).color === 'agent'
                          ? 'bg-agent/15 text-agent'
                          : conv.composer.composer.mode === 'terminal'
                            ? 'bg-terminal/15 text-terminal'
                            : 'bg-chat/15 text-chat'
                          }`}>
                          {getModeInfo(conv.composer.composer.mode).label}
                        </span>
                        <span className="text-xs text-text-muted">
                          📁 {conv.composer.workspaceName}
                        </span>
                        {conv.bubbles.length > 0 && (
                          <span className="text-xs text-text-muted ml-auto">
                            {conv.bubbles.length} message{conv.bubbles.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-text-primary mb-3">
                        {conv.composer.composer.name}
                      </h3>
                      <div className="space-y-3">
                        {conv.bubbles.length === 0 ? (
                          <div className="text-text-muted text-sm italic">
                            {dateFilter === 'all' 
                              ? 'No messages found' 
                              : `No messages from ${dateFilter === 'today' ? 'today' : 'yesterday'}`}
                          </div>
                        ) : (
                          conv.bubbles.map((bubble) => (
                            <div
                              key={bubble.bubbleId}
                              className={`rounded-lg p-3 ${bubble.type === 1
                                ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                                : 'bg-bg-secondary border-l-2 border-terminal'
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-semibold text-text-muted uppercase">
                                  {bubble.type === 1 ? '👤 User' : '🤖 AI'}
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
                              <div className="text-sm text-text-secondary whitespace-pre-wrap break-words leading-relaxed">
                                {bubble.text.length > 500
                                  ? bubble.text.substring(0, 500) + '...'
                                  : bubble.text}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredData.filter(conv => conv.bubbles.length > 0).length === 0 && dateFilter !== 'all' && (
                    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                      <span className="text-4xl opacity-50">📭</span>
                      <span className="mt-3 text-sm font-medium">No messages found for this filter</span>
                      <span className="text-xs mt-1">Try selecting "All Dates" to see all messages</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-border shrink-0">
              <div className="text-xs text-text-muted">
                {!loading && (
                  <>
                    {filteredData.reduce((acc, c) => acc + c.bubbles.length, 0)} messages
                    {dateFilter !== 'all' && ` (filtered from ${messageCounts.all} total)`}
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Dialog.Close className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary transition-all text-sm font-medium">
                  Close
                </Dialog.Close>
                <button
                  onClick={handleCopyFromModal}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-secondary transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  📋 Copy as Markdown
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
