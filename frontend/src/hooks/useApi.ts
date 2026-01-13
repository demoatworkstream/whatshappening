import { useState, useEffect, useCallback } from 'react';
import type { DateGroup, WorkspaceSummary, Workspace, Composer, Bubble } from '../types';

const API_BASE = '/api';

export function useDates() {
  const [dates, setDates] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/dates`)
      .then((res) => res.json())
      .then(setDates)
      .finally(() => setLoading(false));
  }, []);

  return { dates, loading };
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/workspaces?days=30`)
      .then((res) => res.json())
      .then(setWorkspaces)
      .finally(() => setLoading(false));
  }, []);

  return { workspaces, loading };
}

export function useWorkspace(id: string | null, filterDate?: string | null) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setWorkspace(null);
      return;
    }

    setLoading(true);
    const url = filterDate 
      ? `${API_BASE}/workspaces/${id}?date=${filterDate}`
      : `${API_BASE}/workspaces/${id}`;
    
    fetch(url)
      .then((res) => res.json())
      .then(setWorkspace)
      .finally(() => setLoading(false));
  }, [id, filterDate]);

  return { workspace, loading };
}

export function useComposers(filterDate?: string | null) {
  const [composers, setComposers] = useState<Composer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = filterDate 
      ? `${API_BASE}/composers?date=${filterDate}`
      : `${API_BASE}/composers`;
    
    fetch(url)
      .then((res) => res.json())
      .then(setComposers)
      .finally(() => setLoading(false));
  }, [filterDate]);

  return { composers, loading };
}

export function useSearch() {
  const [results, setResults] = useState<Array<{ workspace: string; folder: string | null; prompt: { text: string; commandType: number } }>>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
}

export function useBubbles(composerId: string | null) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!composerId) {
      setBubbles([]);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/composers/${composerId}/bubbles`)
      .then((res) => res.json())
      .then(setBubbles)
      .finally(() => setLoading(false));
  }, [composerId]);

  return { bubbles, loading };
}
