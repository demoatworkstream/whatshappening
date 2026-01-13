import { useState, useMemo } from 'react';
import { useDates, useComposers } from './hooks/useApi';
import { useSelection } from './hooks/useSelection';
import { DateList } from './components/DateList';
import { ComposerList } from './components/ComposerList';
import { SelectionPanel } from './components/SelectionPanel';
import { ConversationDetail } from './components/ConversationDetail';
import { formatFullDate, getWorkspaceName } from './lib/utils';
import type { Composer } from './types';

function App() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewingComposer, setViewingComposer] = useState<Composer | null>(null);

  const { dates, loading: datesLoading } = useDates();
  const { composers, loading: composersLoading } = useComposers(selectedDate);

  const {
    selectedList,
    isSelected,
    toggleSelection,
    removeSelection,
    clearAll,
  } = useSelection();

  // Auto-select today on first load
  useMemo(() => {
    if (dates.length > 0 && !selectedDate) {
      const today = new Date().toLocaleDateString('en-CA');
      const todayDate = dates.find((d) => d.date === today);
      if (todayDate) {
        setSelectedDate(today);
      } else if (dates.length > 0) {
        setSelectedDate(dates[0].date);
      }
    }
  }, [dates, selectedDate]);

  const handleComposerClick = (composer: Composer, workspaceName: string) => {
    // Single click: view details AND toggle selection
    setViewingComposer({
      ...composer,
      workspaceFolder: composer.workspaceFolder,
      workspaceId: composer.workspaceId,
    } as Composer);
    toggleSelection(composer, workspaceName);
  };

  const handleSelectAll = () => {
    composers.forEach(c => {
      const workspaceName = c.workspaceFolder 
        ? getWorkspaceName(c.workspaceFolder, c.workspaceId || '')
        : 'Unknown';
      if (!isSelected(c.composerId)) {
        toggleSelection(c, workspaceName);
      }
    });
  };

  const selectedDateInfo = dates.find(d => d.date === selectedDate);

  return (
    <div className="h-screen overflow-hidden grid grid-cols-[260px_1fr_400px_320px]">
      {/* Sidebar - Dates */}
      <aside className="bg-bg-secondary border-r border-border flex flex-col h-screen overflow-hidden">
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-agent flex items-center justify-center text-base">
              💬
            </div>
            <div>
              <div className="font-semibold text-base leading-tight">Chat Browser</div>
              <div className="text-[10px] text-text-muted">Cursor AI History</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <DateList
            dates={dates}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setViewingComposer(null);
            }}
            loading={datesLoading}
          />
        </div>
      </aside>

      {/* Composer List */}
      <div className="bg-bg-primary border-r border-border flex flex-col h-screen overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <div className="font-medium text-sm">
              {selectedDate ? formatFullDate(selectedDate) : 'Select a date'}
            </div>
            {selectedDateInfo && (
              <div className="text-[10px] text-text-muted mt-0.5">
                {selectedDateInfo.composerCount} conversations
              </div>
            )}
          </div>
          <button
            onClick={handleSelectAll}
            disabled={composers.length === 0}
            className="px-2 py-1 text-[10px] font-medium rounded bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary transition-all disabled:opacity-50"
          >
            Select All
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <ComposerList
            composers={composers}
            isSelected={isSelected}
            onToggle={handleComposerClick}
            onSelectAll={handleSelectAll}
            loading={composersLoading}
            showWorkspace={true}
            activeComposerId={viewingComposer?.composerId}
          />
        </div>
      </div>

      {/* Conversation Detail */}
      <div className="bg-bg-primary border-r border-border h-screen overflow-hidden">
        <ConversationDetail
          composer={viewingComposer}
          selectedDate={selectedDate}
          onClose={() => setViewingComposer(null)}
        />
      </div>

      {/* Selection Panel */}
      <div className="bg-bg-secondary h-screen overflow-hidden">
        <SelectionPanel
          selections={selectedList}
          onRemove={removeSelection}
          onClearAll={clearAll}
        />
      </div>
    </div>
  );
}

export default App;
