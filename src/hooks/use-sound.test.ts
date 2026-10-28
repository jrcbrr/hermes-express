import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SOUND_STORAGE_KEY, useSound } from "./use-sound";

describe("useSound", () => {
  it("is unmuted by default", () => {
    const { result } = renderHook(() => useSound());
    expect(result.current.muted).toBe(false);
  });

  it("reads a saved mute choice", () => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, "true");
    const { result } = renderHook(() => useSound());
    expect(result.current.muted).toBe(true);
  });

  it("toggles mute, saves it, and updates every component using the hook", () => {
    const first = renderHook(() => useSound());
    const second = renderHook(() => useSound());

    act(() => first.result.current.toggleMuted());
    expect(first.result.current.muted).toBe(true);
    expect(second.result.current.muted).toBe(true);
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe("true");

    act(() => first.result.current.toggleMuted());
    expect(second.result.current.muted).toBe(false);
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe("false");
  });

  it("picks up changes made in another tab", () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      window.localStorage.setItem(SOUND_STORAGE_KEY, "true");
      window.dispatchEvent(
        new StorageEvent("storage", { key: SOUND_STORAGE_KEY }),
      );
    });
    expect(result.current.muted).toBe(true);
  });

  it("exposes play(), which is silent until Stage 8", () => {
    const { result } = renderHook(() => useSound());
    expect(() => result.current.play("ding")).not.toThrow();
  });
});
