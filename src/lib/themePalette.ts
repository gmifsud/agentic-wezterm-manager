import type { AgenticConfig, ColorPalette } from "../../shared/schema";
import { BUILTIN_SCHEME_PALETTES } from "../../shared/builtinSchemes";

// ---------- colour utilities ----------------------------------------------

interface Rgb {
  r: number;
  g: number;
  b: number;
}
interface Hsl {
  h: number;
  s: number;
  l: number;
}

function parseHex(hex: string): Rgb | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** "#rrggbb" → "H S% L%" string compatible with `hsl(var(--x))` in variables.css */
export function hexToHsl(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "0 0% 0%";
  const { h, s, l } = rgbToHsl(rgb);
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Linear interpolation between two hex colours. `t` in [0,1]. */
function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return a;
  const r = Math.round(ra.r + (rb.r - ra.r) * t);
  const g = Math.round(ra.g + (rb.g - ra.g) * t);
  const bl = Math.round(ra.b + (rb.b - ra.b) * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Pick a high-contrast foreground (#000 or #fff) for a given background. */
function contrastFg(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  // WCAG relative luminance
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L =
    0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
  return L > 0.5 ? "#000000" : "#ffffff";
}

// ---------- palette → CSS variables ---------------------------------------

/**
 * Map a WezTerm ColorPalette onto the design-token CSS variables used in
 * variables.css. Returns "H S% L%" strings (no `hsl(...)` wrapper) because
 * the stylesheet does `hsl(var(--background))`.
 */
export function paletteToCssVars(p: ColorPalette): Record<string, string> {
  const bg = p.background;
  const fg = p.foreground;
  const primary = p.ansi[4]; // blue family
  const destructive = p.ansi[1]; // red family

  return {
    "--background": hexToHsl(bg),
    "--foreground": hexToHsl(fg),
    "--card": hexToHsl(mix(bg, fg, 0.05)),
    "--card-foreground": hexToHsl(fg),
    "--popover": hexToHsl(mix(bg, fg, 0.05)),
    "--popover-foreground": hexToHsl(fg),
    "--primary": hexToHsl(primary),
    "--primary-foreground": hexToHsl(contrastFg(primary)),
    "--secondary": hexToHsl(mix(bg, fg, 0.1)),
    "--secondary-foreground": hexToHsl(fg),
    "--muted": hexToHsl(mix(bg, fg, 0.1)),
    "--muted-foreground": hexToHsl(mix(bg, fg, 0.55)),
    "--accent": hexToHsl(mix(bg, fg, 0.15)),
    "--accent-foreground": hexToHsl(fg),
    "--destructive": hexToHsl(destructive),
    "--destructive-foreground": hexToHsl(contrastFg(destructive)),
    "--border": hexToHsl(mix(bg, fg, 0.18)),
    "--input": hexToHsl(mix(bg, fg, 0.18)),
    "--ring": hexToHsl(primary),
  };
}

/**
 * Resolve the active palette from config:
 *   - custom theme via `activeTheme` if it exists
 *   - else built-in scheme from our curated database
 *   - else null (caller should fall back to default CSS vars)
 */
export function resolveActivePalette(
  config: AgenticConfig,
): ColorPalette | null {
  if (config.activeTheme && config.themes[config.activeTheme]) {
    return config.themes[config.activeTheme];
  }
  return BUILTIN_SCHEME_PALETTES[config.appearance.colorScheme] ?? null;
}

const PALETTE_VAR_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
] as const;

/** Apply palette-derived CSS vars to <html>, or clear them if `palette` is null. */
export function applyPaletteToRoot(palette: ColorPalette | null): void {
  const style = document.documentElement.style;
  if (palette) {
    const vars = paletteToCssVars(palette);
    for (const [k, v] of Object.entries(vars)) style.setProperty(k, v);
  } else {
    for (const name of PALETTE_VAR_NAMES) style.removeProperty(name);
  }
}
