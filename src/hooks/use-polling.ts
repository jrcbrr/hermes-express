"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const POLL_INTERVAL_MS = 10_000;

type PollingOptions<T> = {
  url: string;
  onData: (data: T) => void;
  /** Turn off when there is nothing left to wait for. */
  enabled?: boolean;
  intervalMs?: number;
};

/**
 * Fetches `url` every 10 seconds (docs/PLAN.md §7: polling, not websockets).
 * Waits while the tab is hidden and looks again as soon as it returns. A failed
 * request keeps the last good data and sets `failed` until one succeeds.
 */
export function usePolling<T>({
  url,
  onData,
  enabled = true,
  intervalMs = POLL_INTERVAL_MS,
}: PollingOptions<T>) {
  const [failed, setFailed] = useState(false);
  const latestOnData = useRef(onData);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    latestOnData.current = onData;
  });

  const refresh = useCallback(async () => {
    // A newer look replaces an older one, so old data can't arrive last.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = (await response.json()) as T;
      if (controller.signal.aborted) return;
      latestOnData.current(data);
      setFailed(false);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      inFlight.current?.abort();
    };
  }, [enabled, intervalMs, refresh]);

  return { failed, refresh };
}
