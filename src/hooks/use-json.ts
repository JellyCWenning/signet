"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialData == null);

  const reload = useCallback(async () => {
    try {
      const next = await loadJson<T>(url);
      setData(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;

    function tick() {
      void loadJson<T>(url)
        .then((next) => {
          if (cancelled) return;
          setData(next);
          setError(null);
          setLoading(false);
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setError(caught instanceof Error ? caught.message : "Failed to load");
          setLoading(false);
        });
    }

    tick();
    const interval = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [intervalMs, url]);

  return { data, error, loading, reload };
}
