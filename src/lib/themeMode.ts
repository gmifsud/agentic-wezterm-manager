import type { AgenticConfig } from "../../shared/schema";

export type UiMode = "light" | "dark";

// Built-in WezTerm schemes whose names don't contain "Light"/"Dark"
// but are clearly one or the other. Anything not listed and not name-tagged
// falls back to `dark` (the majority of WezTerm built-ins).
const EXPLICIT_LIGHT_SCHEMES = new Set<string>([
  "Belafonte Day",
  "Catppuccin Latte",
  "Flat",
  "Novel",
  "One Light",
  "Piatto Light",
  "Tomorrow",
  "Solarized Darcula", // light despite the name
]);

const EXPLICIT_DARK_SCHEMES = new Set<string>([
  "Dracula",
  "Nord",
  "One Dark",
  "Tokyo Night",
  "Catppuccin Mocha",
  "Catppuccin Frappe",
  "Catppuccin Macchiato",
  "Monokai",
  "Monokai Pro (Gogh)",
  "Monokai Pro Machine (Gogh)",
  "Monokai Pro Octagon (Gogh)",
  "Monokai Pro Ristretto (Gogh)",
  "Monokai Pro Spectrum (Gogh)",
  "Cyberpunk",
  "Gotham",
  "Horizon",
  "Hyper",
  "Kanagawa",
  "Molokai",
  "Nightfox",
  "Panda",
  "Snazzy",
  "SpaceGray",
  "Wez",
  "Wombat",
  "Twilight",
  "zenburn",
]);

function classifyBuiltinScheme(name: string): UiMode {
  if (EXPLICIT_LIGHT_SCHEMES.has(name)) return "light";
  if (EXPLICIT_DARK_SCHEMES.has(name)) return "dark";
  const lower = name.toLowerCase();
  if (lower.includes("light")) return "light";
  if (lower.includes("day")) return "light";
  if (lower.includes("dark")) return "dark";
  if (lower.includes("night")) return "dark";
  return "dark";
}

/**
 * Compute perceived luminance (0..1) of a #rrggbb / #rgb colour.
 * Uses the relative-luminance formula from WCAG 2.x.
 */
function luminance(hex: string): number {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return 0; // unknown → treat as dark
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

/**
 * Derive the web UI's light/dark mode from the same theme selection that
 * drives WezTerm. Custom themes are classified by their background colour's
 * luminance; built-in schemes are classified by name.
 */
export function deriveUiMode(config: AgenticConfig): UiMode {
  if (config.activeTheme && config.themes[config.activeTheme]) {
    return luminance(config.themes[config.activeTheme].background) > 0.5
      ? "light"
      : "dark";
  }
  return classifyBuiltinScheme(config.appearance.colorScheme);
}
