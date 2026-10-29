import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A product photo at the top of a card, cropped to 4:3. The alt text is empty
 * on purpose: the card's heading right below already names the item, so a
 * screen reader would only hear the name twice.
 */
export function MenuPhoto({
  src,
  dimmed = false,
}: {
  src: string | null;
  /** Faded for sold-out items. */
  dimmed?: boolean;
}) {
  if (!src) return null;
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
      <Image
        src={src}
        alt=""
        fill
        // Card widths: 1 column on phones, 2 from 640px, 3 from 1024px.
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
        className={cn(
          "object-cover transition-opacity",
          dimmed && "opacity-50 grayscale",
        )}
      />
    </div>
  );
}
