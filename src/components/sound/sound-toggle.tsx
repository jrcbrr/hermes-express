"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";

export function SoundToggle() {
  const { muted, toggleMuted } = useSound();

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      // A toggle button keeps one label; aria-pressed tells screen readers its state.
      aria-label="Mute sounds"
      aria-pressed={muted}
      onClick={toggleMuted}
    >
      {muted ? (
        <VolumeX className="size-5" aria-hidden="true" />
      ) : (
        <Volume2 className="size-5" aria-hidden="true" />
      )}
    </Button>
  );
}
