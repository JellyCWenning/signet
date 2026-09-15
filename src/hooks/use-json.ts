"use client";

import { useCallback, useEffect, useState } from "react";

export function useJson<T>(url: string, intervalMs = 2500) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(body.error ?? response.statusText);
      }
      setData((await response.json()) as T);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const interval = setInterval(() => {
      void reload();
    }, intervalMs);
    const initial = setTimeout(() => {
      void reload();
    }, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [intervalMs, reload]);

  return { data, error, loading, reload };
}
