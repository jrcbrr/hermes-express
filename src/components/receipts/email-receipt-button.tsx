"use client";

import { Mail } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { emailReceipt } from "@/server/receipts/actions";

/** How long the button rests after a send, matching the server's limit. */
const COOLDOWN_MS = 60_000;

/** Sends the receipt to the email given at checkout, which it shows first. */
export function EmailReceiptButton({
  orderId,
  email,
}: {
  orderId: string;
  email: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [resting, setResting] = useState(false);

  useEffect(() => {
    if (!resting) return;
    const timer = setTimeout(() => setResting(false), COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [resting]);

  function send() {
    setMessage("");
    startTransition(async () => {
      const result = await emailReceipt(orderId);
      setMessage(result.message);
      setResting(result.ok);
    });
  }

  return (
    <div className="flex max-w-full flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 self-start px-5 font-semibold"
        disabled={pending || resting}
        onClick={send}
      >
        <Mail className="size-4" aria-hidden="true" />
        {pending ? "Sending..." : "Email receipt"}
      </Button>
      <p className="text-sm break-words text-muted-foreground">
        Sends to {email}
      </p>
      <p role="status" className="text-sm font-medium empty:hidden">
        {message}
      </p>
    </div>
  );
}
