"use client";

import { useCallback, useEffect, useState } from "react";
import { QueueToast } from "@/components/barista/queue-toast";
import { markBadgesSeen } from "@/server/rewards/actions";

/** Announces newly earned badges once. */
export function BadgeToast({
  keys,
  names,
}: {
  keys: string[];
  names: string[];
}) {
  const [message, setMessage] = useState<string | null>(
    `Badge earned: ${names.join(", ")}.`,
  );
  const dismiss = useCallback(() => setMessage(null), []);

  useEffect(() => {
    // Best effort: at worst the customer sees the same good news again.
    markBadgesSeen(keys).catch(() => undefined);
  }, [keys]);

  return <QueueToast message={message} onDone={dismiss} />;
}
