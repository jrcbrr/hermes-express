import { RotateCcw, Shuffle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BuilderToolbar({
  canUndo,
  canReset,
  onUndo,
  onReset,
  onSurprise,
}: {
  canUndo: boolean;
  canReset: boolean;
  onUndo: () => void;
  onReset: () => void;
  onSurprise: () => void;
}) {
  const button = "h-11 px-3 font-semibold";
  return (
    <div
      role="toolbar"
      aria-label="Drink actions"
      className="flex flex-wrap gap-2"
    >
      <Button
        type="button"
        variant="outline"
        className={button}
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 aria-hidden="true" />
        Undo
      </Button>
      <Button
        type="button"
        variant="outline"
        className={button}
        disabled={!canReset}
        onClick={onReset}
      >
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={button}
        onClick={onSurprise}
      >
        <Shuffle aria-hidden="true" />
        Surprise me
      </Button>
    </div>
  );
}
