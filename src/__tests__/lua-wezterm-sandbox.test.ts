// @vitest-environment node
// Generated Lua must load under WezTerm's restricted sandbox where the
// debug library is nil. If it tries to index debug, the entire file fails
// to dofile, the user's ~/.wezterm.lua pcall catches it, and agentic
// becomes nil — every pane then spawns with default_prog (empty PowerShell)
// instead of the configured commands.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { generateLuaText } from '../../shared/lua-generator';
import { agenticConfigSchema } from '../../shared/schema';

const LUA_HARNESS = [
  '-- WezTerm-style sandbox: strip the debug library entirely.',
  'debug = nil',
  '-- Polyfill table.unpack for Lua 5.1 (where it lives at global scope).',
  'table.unpack = table.unpack or unpack',
  '-- Stand in for the wezterm global so the generated file does not',
  '-- blow up on requires that exist at config-load time but not at',
  '-- dofile time. The body of the file touches a few wezterm fields',
  "-- but only inside functions that don't run during dofile itself.",
  'local function _noop() end',
  'local function _mkAction() return function() end end',
  'local function _mkMux() return {} end',
  'wezterm = { log_info = _noop, font = function(f) return f end, action = setmetatable({}, { __index = _mkAction }), time = { call_after = _noop } }',
  'wezterm.mux = setmetatable({}, { __index = _mkMux })',
  '-- Now load the generated lua exactly the way ~/.wezterm.lua does.',
  'local f = io.open(arg[1], "r"); assert(f, "cannot open generated lua")',
  'local src = f:read("*a"); f:close()',
  'local chunk, lerr = loadstring(src, arg[1])',
  'assert(chunk, "loadstring failed: " .. tostring(lerr))',
  'local ok, result = pcall(chunk)',
  'if not ok then',
  '  io.stderr:write("FAIL: " .. tostring(result) .. "\\n")',
  '  os.exit(1)',
  'end',
  'assert(type(result) == "table", "expected module table, got " .. type(result))',
  'assert(result.startup and result.startup.layout and result.startup.layout.leftCommand,',
  '       "leftCommand missing")',
  'assert(string.find(result.startup.layout.leftCommand.command, "Consulting the oracle"),',
  '       "leftCommand.command does not contain expected text")',
  'io.stdout:write("OK under wezterm sandbox\\n")',
].join('\n');

describe('generated lua runs under wezterm-like sandbox', () => {
  it('loads cleanly when debug=nil (wezterm sandbox)', () => {
    const lua = generateLuaText(agenticConfigSchema.parse({}));
    const tmp = mkdtempSync(path.join(tmpdir(), 'lua-sandbox-'));
    const luaFile = path.join(tmp, 'agentic.lua');
    const harnessFile = path.join(tmp, 'harness.lua');
    writeFileSync(luaFile, lua);
    writeFileSync(harnessFile, LUA_HARNESS);

    // Probe for any installed Lua interpreter.
    for (const bin of ['lua5.4', 'lua5.3', 'lua5.1', 'lua', 'luajit']) {
      const probe = spawnSync(bin, ['-v'], { encoding: 'utf-8' });
      if (probe.status !== 0 && !probe.stdout && !probe.stderr) continue;

      const result = spawnSync(bin, [harnessFile, luaFile], { encoding: 'utf-8' });
      expect(
        result.status,
        `lua interpreter ${bin} failed: status=${result.status} stderr=${result.stderr}`,
      ).toBe(0);
      expect(result.stdout).toContain('OK under wezterm sandbox');
      expect(result.stderr).not.toContain('attempt to index a nil value');
      return;
    }

    // No Lua interpreter found — skip. The check matters most where WezTerm
    // is in use; CI without Lua still moves on.
  }, 15_000);

  it('manager_dir helper is debug-tolerant at the JS layer', () => {
    // Smoke-check the helper at the JS layer so the regression is caught
    // even on machines without a Lua interpreter installed.
    const lua = generateLuaText(agenticConfigSchema.parse({}));
    expect(lua).toContain('pcall(function()');
    expect(lua).toContain(
      "return debug.getinfo and debug.getinfo(1, 'S') or nil",
    );
  });
});