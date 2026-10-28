import { ImageResponse } from "next/og";
import { LOGO_MARK_PATHS } from "@/components/brand/logo-mark";

// Home-screen icon for iOS: the gold winged cup on cream.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Raw colours are needed here: this image is rendered outside the page, so
// the CSS theme variables don't exist. Values match globals.css.
const CREAM = "#FAF6EF";
const GOLD = "#B8892E";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: CREAM,
      }}
    >
      <svg
        width="132"
        height="132"
        viewBox="0 0 48 48"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {LOGO_MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>,
    size,
  );
}
