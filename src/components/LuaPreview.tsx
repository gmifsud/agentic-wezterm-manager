import React, { useMemo, useState } from 'react';
import type { ColorPalette } from '../../shared/schema';

interface LuaPreviewProps {
  lua: string;
  width: number;
  changes: string[] | null;
  onDismissChanges: () => void;
  palette: ColorPalette | null;
}

interface SyntaxColors {
  bg: string;
  headerBg: string;
  border: string;
  fg: string;
  muted: string;
  keyword: string;
  builtin: string;
  string: string;
  number: string;
  member: string;
  hoverBg: string;
  dotRed: string;
  dotYellow: string;
  dotGreen: string;
}

// GitHub Dark fallback (matches previous hard-coded look)
const DEFAULT_COLORS: SyntaxColors = {
  bg: '#0d1117',
  headerBg: '#161b22',
  border: '#30363d',
  fg: '#e6edf3',
  muted: '#8b949e',
  keyword: '#ff7b72',
  builtin: '#d2a8ff',
  string: '#a5d6ff',
  number: '#79c0ff',
  member: '#ffa657',
  hoverBg: 'rgba(255,255,255,0.02)',
  dotRed: '#ff5f57',
  dotYellow: '#febc2e',
  dotGreen: '#28c840',
};

// linear blend two hex colors → "rgba(r,g,b,1)"
function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function colorsFromPalette(p: ColorPalette): SyntaxColors {
  // ANSI indexes: 0=black 1=red 2=green 3=yellow 4=blue 5=magenta 6=cyan 7=white
  return {
    bg: p.background,
    headerBg: mix(p.background, p.foreground, 0.06),
    border: mix(p.background, p.foreground, 0.2),
    fg: p.foreground,
    muted: mix(p.background, p.foreground, 0.55),
    keyword: p.ansi[1] || p.brights[1] || DEFAULT_COLORS.keyword,
    builtin: p.brights[5] || p.ansi[5] || DEFAULT_COLORS.builtin,
    string: p.ansi[2] || p.brights[2] || DEFAULT_COLORS.string,
    number: p.brights[4] || p.ansi[4] || DEFAULT_COLORS.number,
    member: p.ansi[3] || p.brights[3] || DEFAULT_COLORS.member,
    hoverBg: mix(p.background, p.foreground, 0.04),
    dotRed: p.ansi[1] || DEFAULT_COLORS.dotRed,
    dotYellow: p.ansi[3] || DEFAULT_COLORS.dotYellow,
    dotGreen: p.ansi[2] || DEFAULT_COLORS.dotGreen,
  };
}

export const LuaPreview = React.memo(function LuaPreview({ lua, width, changes, onDismissChanges, palette }: LuaPreviewProps) {
  const [copied, setCopied] = useState(false);

  const colors = useMemo<SyntaxColors>(
    () => (palette ? colorsFromPalette(palette) : DEFAULT_COLORS),
    [palette],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(lua).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const highlightedHtml = useMemo(() => {
    return lua.split('\n').map((line, i) => {
      const num = `<span class="inline-block w-10 text-right pr-4 select-none flex-shrink-0" style="color:${colors.muted};opacity:0.7">${i + 1}</span>`;
      const content = `<span class="flex-1 whitespace-pre" style="color:${colors.fg}">${highlightLua(line, colors)}</span>`;
      return `<div class="flex -mx-4 px-4" style="color:${colors.fg}">${num}${content}</div>`;
    }).join('');
  }, [lua, colors]);

  return (
    <div
      className="flex flex-col overflow-hidden hidden lg:flex border-l"
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        borderColor: colors.border,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {/* Code fence header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: colors.headerBg, borderColor: colors.border }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: colors.dotRed }} />
            <div className="w-3 h-3 rounded-full" style={{ background: colors.dotYellow }} />
            <div className="w-3 h-3 rounded-full" style={{ background: colors.dotGreen }} />
          </div>
          <span className="text-xs font-semibold ml-2" style={{ color: colors.muted }}>lua</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1 rounded-md border transition-colors"
          style={{
            background: colors.headerBg,
            color: colors.fg,
            borderColor: colors.border,
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Change summary */}
      {changes && changes.length > 0 && (
        <div
          className="border-b px-4 py-3"
          style={{ background: colors.bg, borderColor: colors.border }}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: colors.number }}>Changes saved</span>
            <button
              onClick={onDismissChanges}
              className="text-xs"
              style={{ color: colors.muted }}
            >
              ✕
            </button>
          </div>
          <ul className="space-y-1">
            {changes.map((change, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={{ color: colors.fg }}>
                <span className="mt-0.5" style={{ color: colors.string }}>+</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Code content */}
      <div 
        className="flex-1 overflow-auto" 
        style={{ 
          background: colors.bg,
          '--hover-bg': colors.hoverBg
        } as React.CSSProperties}
      >
        <div className="p-4">
          <pre 
            className="text-xs font-mono leading-relaxed pointer-events-none"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>
      </div>
    </div>
  );
});

function highlightLua(line: string, c: SyntaxColors): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('--')) {
    return `<span style="color:${c.muted};font-style:italic">${escapeHtml(line)}</span>`;
  }

  let result = escapeHtml(line);

  result = result.replace(
    /\b(local|function|return|if|then|else|elseif|end|for|in|do|while|repeat|until|not|and|or|true|false|nil)\b/g,
    `<span style="color:${c.keyword}">$1</span>`,
  );
  result = result.replace(
    /\b(require|pcall|table|ipairs|pairs|string|tonumber|tostring)\b/g,
    `<span style="color:${c.builtin}">$1</span>`,
  );
  result = result.replace(
    /('(?:[^'\\]|\\.)*')/g,
    `<span style="color:${c.string}">$1</span>`,
  );
  result = result.replace(
    /\b(\d+\.?\d*)\b/g,
    `<span style="color:${c.number}">$1</span>`,
  );
  result = result.replace(
    /(\w+)(\.)(\w+)/g,
    `$1<span style="color:${c.muted}">$2</span><span style="color:${c.member}">$3</span>`,
  );

  return result;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
