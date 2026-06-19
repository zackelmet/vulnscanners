// Registers IBM Plex Sans for the report templates. Called once before any
// render. Files live in public/fonts so they're read from disk at runtime the
// same way the cover/footer logo is (process.cwd()/public).
import { Font } from "@react-pdf/renderer";
import path from "node:path";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

let registered = false;

export function registerReportFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "IBM Plex Sans",
    fonts: [
      { src: path.join(FONT_DIR, "IBMPlexSans-Light.ttf"), fontWeight: 300 },
      { src: path.join(FONT_DIR, "IBMPlexSans-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "IBMPlexSans-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "IBMPlexSans-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "IBMPlexSans-Bold.ttf"), fontWeight: 700 },
    ],
  });

  // Keep long tokens (URLs, hostnames, port strings) from being hyphenated.
  Font.registerHyphenationCallback((word) => [word]);
}
