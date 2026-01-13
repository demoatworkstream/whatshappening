import { useState, useCallback, useMemo } from 'react';
import type { Composer, SelectedComposer } from '../types';

export function useSelection() {
  const [selections, setSelections] = useState<Map<string, SelectedComposer>>(new Map());

  const isSelected = useCallback(
    (composerId: string) => {
      return selections.has(composerId);
    },
    [selections]
  );

  const toggleSelection = useCallback(
    (composer: Composer, workspaceName: string) => {
      setSelections((prev) => {
        const next = new Map(prev);
        const key = composer.composerId;

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, { composer, workspaceName });
        }

        return next;
      });
    },
    []
  );

  const selectAll = useCallback(
    (composers: Composer[], workspaceName: string) => {
      setSelections((prev) => {
        const next = new Map(prev);
        composers.forEach((composer) => {
          const key = composer.composerId;
          if (!next.has(key)) {
            next.set(key, { composer, workspaceName });
          }
        });
        return next;
      });
    },
    []
  );

  const removeSelection = useCallback((key: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelections(new Map());
  }, []);

  const countByWorkspace = useCallback(
    (workspaceId: string) => {
      let count = 0;
      selections.forEach((val) => {
        if (val.composer.workspaceId === workspaceId) count++;
      });
      return count;
    },
    [selections]
  );

  const selectedList = useMemo(() => Array.from(selections.entries()), [selections]);
  const selectedCount = selections.size;

  return {
    selections,
    selectedList,
    selectedCount,
    isSelected,
    toggleSelection,
    selectAll,
    removeSelection,
    clearAll,
    countByWorkspace,
  };
}
