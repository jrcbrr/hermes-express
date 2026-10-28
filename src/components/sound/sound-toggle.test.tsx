import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SOUND_STORAGE_KEY } from "@/hooks/use-sound";
import { SoundToggle } from "./sound-toggle";

describe("SoundToggle", () => {
  it("is a toggle button that starts unmuted", () => {
    render(<SoundToggle />);
    expect(
      screen.getByRole("button", { name: "Mute sounds", pressed: false }),
    ).toBeInTheDocument();
  });

  it("mutes on click and remembers it", () => {
    render(<SoundToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Mute sounds" }));

    expect(
      screen.getByRole("button", { name: "Mute sounds", pressed: true }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe("true");
  });
});
