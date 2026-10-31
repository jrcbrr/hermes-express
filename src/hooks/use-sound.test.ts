import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  describe("play", () => {
    const play = vi.fn(() => Promise.resolve());
    beforeEach(() => {
      play.mockClear();
      window.localStorage.removeItem(SOUND_STORAGE_KEY);
      vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("plays the sound", () => {
      const { result } = renderHook(() => useSound());
      result.current.play("ding");
      expect(play).toHaveBeenCalledTimes(1);
    });

    it("stays silent when muted", () => {
      window.localStorage.setItem(SOUND_STORAGE_KEY, "true");
      const { result } = renderHook(() => useSound());
      result.current.play("clink");
      expect(play).not.toHaveBeenCalled();
    });

    it("ignores a browser refusing to play", async () => {
      play.mockImplementationOnce(() => Promise.reject(new Error("blocked")));
      const { result } = renderHook(() => useSound());
      expect(() => result.current.play("pour")).not.toThrow();
      await Promise.resolve();
    });
  });
});
