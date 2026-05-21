#!/usr/bin/env node
/**
 * Fetch every WezTerm built-in colour scheme from the upstream
 * iTerm2-Color-Schemes repository (which ships the WezTerm-format TOML files
 * WezTerm itself loads from) and emit shared/builtinSchemes.ts.
 *
 *   node scripts/fetch-builtin-schemes.mjs
 *
 * Idempotent. Re-run after WezTerm adds new schemes or you extend
 * BUILTIN_COLOR_SCHEMES in shared/schema.ts.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------- Step 1: read the canonical scheme list from the schema -----------
function loadSchemeNames() {
  const src = readFileSync(resolve(ROOT, "shared/schema.ts"), "utf8");
  const m = src.match(/BUILTIN_COLOR_SCHEMES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!m)
    throw new Error("Could not find BUILTIN_COLOR_SCHEMES in shared/schema.ts");
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((mm) => mm[1]);
}

// ---------- Step 2: resolve WezTerm names → upstream filenames ---------------
// WezTerm prefixes some bundled iTerm2 schemes with "Builtin "; strip that.
// A handful of names don't match upstream casing/punctuation — handled below.
// Hand-curated map from WezTerm scheme names (as declared in
// shared/schema.ts) to their corresponding upstream filename in
// mbadolato/iTerm2-Color-Schemes/wezterm/. Anything not listed is tried
// verbatim, then with the "Builtin " prefix stripped.
const NAME_OVERRIDES = {
  "Builtin Solarized Dark": "iTerm2 Solarized Dark",
  "Builtin Solarized Light": "iTerm2 Solarized Light",
  "ayu Dark": "Ayu",
  "ayu Light": "Ayu Light",
  "ayu Mirage": "Ayu Mirage",
  "Tokyo Night": "TokyoNight Night",
  "One Dark": "Atom One Dark",
  "One Light": "Atom One Light",
  "Monokai Pro (Gogh)": "Monokai Pro",
  "Monokai Pro Machine (Gogh)": "Monokai Pro Machine",
  "Monokai Pro Octagon (Gogh)": "Monokai Pro Octagon",
  "Monokai Pro Ristretto (Gogh)": "Monokai Pro Ristretto",
  "Monokai Pro Spectrum (Gogh)": "Monokai Pro Spectrum",
  Monokai: "Monokai Classic",

  Kanagawa: "Kanagawa Wave",
  "Everforest Dark": "Everforest Dark Hard",
  "Everforest Light": "Everforest Light Med",
  "GitHub Light": "GitHub Light Default",
  "Iterm Dark": "iTerm2 Dark Background",
  "Iterm Light": "iTerm2 Light Background",
  "Material Theme": "Material",
  PaulMillr: "Paul Millr",
  SoftServer: "Soft Server",
  SpaceGray: "Spacegray",
  "SpaceGray Eighties": "Spacegray Eighties",
  "SpaceGray Eighties Dull": "Spacegray Eighties Dull",
  "Tango Dark": "iTerm2 Tango Dark",
  "Tango Light": "iTerm2 Tango Light",
  Thelovelace: "Lovelace",
  ToyChest: "Toy Chest",
  VibrantInk: "Vibrant Ink",
  WarmNeon: "Warm Neon",
  WildCherry: "Wild Cherry",
  zenbones: "Zenbones",
  zenburn: "Zenburn",
};

function candidatesFor(name) {
  const explicit = NAME_OVERRIDES[name];
  if (explicit) return [explicit, name];
  return [
    name,
    name.replace(/^Builtin\s+/, ""),
    name.replace(/^Builtin\s+/, "") + " - Patched",
  ];
}

// ---------- Step 3: fetch + parse one TOML scheme ----------------------------
const JSDELIVR = (file) =>
  `https://cdn.jsdelivr.net/gh/mbadolato/iTerm2-Color-Schemes@master/wezterm/${encodeURIComponent(file)}.toml`;

async function fetchScheme(name) {
  for (const candidate of candidatesFor(name)) {
    const res = await fetch(JSDELIVR(candidate));
    if (res.ok) {
      const toml = await res.text();
      return { source: candidate, toml };
    }
  }
  return null;
}

function tomlToPalette(toml) {
  const data = parseToml(toml);
  const c = data.colors ?? data;
  if (!c.background || !c.foreground || !c.ansi || !c.brights) {
    throw new Error("TOML missing required colour fields");
  }
  return {
    foreground: c.foreground,
    background: c.background,
    cursor_bg: c.cursor_bg ?? c.foreground,
    cursor_fg: c.cursor_fg ?? c.background,
    cursor_border: c.cursor_border ?? c.cursor_bg ?? c.foreground,
    selection_fg: c.selection_fg ?? c.background,
    selection_bg: c.selection_bg ?? c.foreground,
    scrollbar_thumb: c.scrollbar_thumb ?? c.ansi[0],
    split: c.split ?? c.ansi[0],
    compose_cursor: c.compose_cursor ?? c.ansi[3],
    ansi: c.ansi,
    brights: c.brights,
    indexed: c.indexed ?? {},
  };
}

// ---------- Step 4: serialise back out as a TS module ------------------------
function paletteToTs(name, p) {
  const arr = (xs) => "[" + xs.map((x) => JSON.stringify(x)).join(", ") + "]";
  const indexedEntries = Object.entries(p.indexed);
  const indexedStr =
    indexedEntries.length === 0
      ? "{}"
      : "{ " +
        indexedEntries
          .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
          .join(", ") +
        " }";
  return `  ${JSON.stringify(name)}: {
    foreground: ${JSON.stringify(p.foreground)},
    background: ${JSON.stringify(p.background)},
    cursor_bg: ${JSON.stringify(p.cursor_bg)},
    cursor_fg: ${JSON.stringify(p.cursor_fg)},
    cursor_border: ${JSON.stringify(p.cursor_border)},
    selection_fg: ${JSON.stringify(p.selection_fg)},
    selection_bg: ${JSON.stringify(p.selection_bg)},
    scrollbar_thumb: ${JSON.stringify(p.scrollbar_thumb)},
    split: ${JSON.stringify(p.split)},
    compose_cursor: ${JSON.stringify(p.compose_cursor)},
    ansi: ${arr(p.ansi)},
    brights: ${arr(p.brights)},
    indexed: ${indexedStr},
  }`;
}

// ---------- Step 5: orchestrate with bounded concurrency ---------------------
async function pMap(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const names = loadSchemeNames();
  console.log(`Fetching ${names.length} schemes from iTerm2-Color-Schemes…`);

  const failures = [];
  const palettes = {};

  await pMap(names, 8, async (name) => {
    try {
      const got = await fetchScheme(name);
      if (!got) {
        failures.push(`${name}  (no upstream file found)`);
        return;
      }
      palettes[name] = tomlToPalette(got.toml);
      if (got.source !== name) {
        console.log(`  ✓ ${name}  ← ${got.source}`);
      } else {
        console.log(`  ✓ ${name}`);
      }
    } catch (err) {
      failures.push(`${name}  (${err.message})`);
    }
  });

  // Emit the TS file (ordered by scheme name for diff stability)
  const sortedNames = Object.keys(palettes).sort();
  const body = sortedNames.map((n) => paletteToTs(n, palettes[n])).join(",\n");
  const out = `// AUTO-GENERATED by scripts/fetch-builtin-schemes.mjs — do not edit by hand.
// Re-run \`node scripts/fetch-builtin-schemes.mjs\` to refresh.
// Source: https://github.com/mbadolato/iTerm2-Color-Schemes/tree/master/wezterm
//
// Maps WezTerm built-in colour scheme names → ColorPalette so the web UI can
// restyle itself to match the terminal theme. Schemes not listed here fall
// back to the light/dark heuristic in src/lib/themeMode.ts.
import type { ColorPalette } from './schema';

export const BUILTIN_SCHEME_PALETTES: Record<string, ColorPalette> = {
${body}
};
`;
  const dest = resolve(ROOT, "shared/builtinSchemes.ts");
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, out, "utf8");
  console.log(
    `\nWrote ${sortedNames.length}/${names.length} schemes → shared/builtinSchemes.ts`,
  );

  if (failures.length > 0) {
    console.log(`\n${failures.length} schemes could not be resolved:`);
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log(
      "\nThese will fall back to the light/dark heuristic in themeMode.ts.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
