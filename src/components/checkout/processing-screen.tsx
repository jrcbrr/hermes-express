import { LoaderCircle } from "lucide-react";

/**
 * The demo payment screen shown while the order is placed. It always
 * succeeds; it only looks like a payment step. No payment details are asked
 * for or sent anywhere.
 */
export function ProcessingScreen({ title }: { title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-6 backdrop-blur">
      <div
        role="status"
        aria-live="polite"
        className="flex max-w-sm flex-col items-center gap-4 text-center"
      >
        <LoaderCircle
          className="size-12 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="font-heading text-xl font-extrabold">{title}</p>
        <p className="text-sm text-muted-foreground">
          This is a demo. No real payment is made.
        </p>
      </div>
    </div>
  );
}
