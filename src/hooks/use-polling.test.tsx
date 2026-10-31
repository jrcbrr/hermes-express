import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS, usePolling } from "./use-polling";

const fetchMock = vi.fn();
const respond = (data: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => data,
});

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
}

const tick = () => act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(respond({ n: 1 }));
  vi.stubGlobal("fetch", fetchMock);
  setHidden(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setHidden(false);
});

describe("usePolling", () => {
  it("fetches every 10 seconds, not on opening", async () => {
    const onData = vi.fn();
    renderHook(() => usePolling({ url: "/x", onData }));
    expect(fetchMock).not.toHaveBeenCalled();
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({ n: 1 });
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits while the tab is hidden and looks again on return", async () => {
    const onData = vi.fn();
    renderHook(() => usePolling({ url: "/x", onData }));
    setHidden(true);
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
    setHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", async () => {
    renderHook(() =>
      usePolling({ url: "/x", onData: vi.fn(), enabled: false }),
    );
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the last data on failure and recovers", async () => {
    const onData = vi.fn();
    const { result } = renderHook(() => usePolling({ url: "/x", onData }));
    fetchMock.mockResolvedValueOnce(respond({}, false));
    await tick();
    expect(result.current.failed).toBe(true);
    expect(onData).not.toHaveBeenCalled();

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await tick();
    expect(result.current.failed).toBe(true);

    await tick();
    expect(result.current.failed).toBe(false);
    expect(onData).toHaveBeenCalledTimes(1);
  });

  it("ignores an older answer when a newer look has started", async () => {
    const onData = vi.fn();
    let finishOld: (value: unknown) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (finishOld = resolve)),
    );
    const { result } = renderHook(() => usePolling({ url: "/x", onData }));
    await tick();
    await act(() => result.current.refresh());
    expect(onData).toHaveBeenCalledTimes(1);
    await act(async () => finishOld(respond({ n: "old" })));
    expect(onData).toHaveBeenCalledTimes(1);
  });

  it("stops polling when unmounted", async () => {
    const { unmount } = renderHook(() =>
      usePolling({ url: "/x", onData: vi.fn() }),
    );
    unmount();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
