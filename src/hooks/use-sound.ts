"use client";

import { useCallback, useSyncExternalStore } from "react";

export const SOUND_STORAGE_KEY = "hx-sound-muted";

/** Sound effects from docs/PLAN.md §3, made by scripts/generate-sounds.mjs. */
export type SoundName = "pour" | "clink" | "ding";

const VOLUME = 0.5;
const players = new Map<SoundName, HTMLAudioElement>();

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

  // Reads the saved choice, so a call from a stale render still respects mute.
  const play = useCallback((sound: SoundName) => {
    if (getSnapshot()) return;
    const player = players.get(sound) ?? new Audio(`/sounds/${sound}.wav`);
    players.set(sound, player);
    player.volume = VOLUME;
    player.currentTime = 0;
    // Browsers refuse to play before the first tap; a sound isn't worth an error.
    void player.play()?.catch(() => undefined);
  }, []);

  return { muted, toggleMuted, play };
}
