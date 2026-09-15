"use client";

import { useCallback, useEffect, useRef, useState } from "react";

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((body as { error?: string }).error ?? response.statusText);
  }
  return (await response.json()) as T;
}

export function useJson<T>(
  url: string,
  intervalMs = 2500,
  initialData: T | null = null,
) {
  const [data, setDataState] = useState<T | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialData == null);
  const [resource, setResource] = useState(url);
  const generation = useRef(0);

  if (url !== resource) {
    setResource(url);
    setDataState(initialData);
    setLoading(initialData == null);
    setError(null);
  }

  const apply = useCallback((next: T, expected: number) => {
    if (expected !== generation.current) return false;
    setDataState(next);
    setError(null);
    setLoading(false);
    return true;
  }, []);

  const setData = useCallback((next: T) => {
    generation.current += 1;
    setDataState(next);
    setError(null);
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    const expected = ++generation.current;
    try {
      const next = await loadJson<T>(url);
      apply(next, expected);
      return next;
    } catch (caught) {
      if (expected === generation.current) {
        setError(caught instanceof Error ? caught.message : "Failed to load");
        setLoading(false);
      }
      return null;
    }
  }, [apply, url]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const expected = ++generation.current;
      try {
        const next = await loadJson<T>(url);
        if (cancelled) return;
        apply(next, expected);
      } catch (caught: unknown) {
        if (cancelled || expected !== generation.current) return;
        setError(caught instanceof Error ? caught.message : "Failed to load");
        setLoading(false);
      }
    }

    void tick();
    const interval = window.setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apply, intervalMs, url]);

  return { data, error, loading, reload, setData };
}
