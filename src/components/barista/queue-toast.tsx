"use client";

import { useEffect } from "react";

const VISIBLE_MS = 6_000;

/**
 * A short notice for new orders. The live region stays in the page so screen
 * readers announce each message.
 */
export function QueueToast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div
      role="status"
      data-testid="queue-toast"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:bottom-6"
    >
      {message ? (
        <p className="rounded-xl border bg-surface px-4 py-3 font-semibold shadow-lg">
          {message}
        </p>
      ) : null}
    </div>
  );
}
