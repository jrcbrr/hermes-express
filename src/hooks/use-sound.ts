"use client";

import { useCallback, useSyncExternalStore } from "react";

export const SOUND_STORAGE_KEY = "hx-sound-muted";

/** Sound effects planned in docs/PLAN.md §3. Files arrive in Stage 8. */
export type SoundName = "pour" | "clink" | "ding";

// Same-tab listeners. The browser's "storage" event only fires in other tabs.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(SOUND_STORAGE_KEY) === "true";
}

// Sound is on by default, including during server rendering.
function getServerSnapshot() {
  return false;
}

/**
 * Sound preference shared by every component. The mute choice is saved in
 * localStorage so it survives reloads and stays in sync across tabs.
 */
export function useSound() {
  const muted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleMuted = useCallback(() => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(!getSnapshot()));
    listeners.forEach((listener) => listener());
  }, []);

  // Placeholder until Stage 8 adds the audio files. Callers can already use it.
  const play = useCallback((sound: SoundName) => {
    void sound;
  }, []);

  return { muted, toggleMuted, play };
}
