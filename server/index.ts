import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { routes } from './routes';
import { getMetadata } from './storage';

// import.meta.url is real under tsx (ESM) and substituted from __filename by
// scripts/build-server.mjs in the CJS bundle.
const __thisDir = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

// Locate the built Vite assets. Supports two layouts:
//   - bundled:    dist-server/index.cjs        -> ../dist
//   - tsc layout: dist-server/server/index.js  -> ../../dist
function findDistDir(): string {
  const candidates = [
    path.resolve(__thisDir, '../dist'),
    path.resolve(__thisDir, '../../dist'),
  ];
  return (
    candidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) ??
    candidates[0]
  );
}

const distDir = findDistDir();

// pkg exposes assets through a virtual snapshot filesystem that only this
// process can read, but scripts/ has to be reachable by WezTerm and PowerShell.
// Copy it next to the exe, which is where {managerDir} resolves to in packaged
// installs. In dev the real scripts/ is already on disk.
function deployBundledScripts(): void {
  const { isPackaged, configDir } = getMetadata();
  if (!isPackaged) return;
  const source = path.resolve(__thisDir, '../scripts');
  const target = path.join(configDir, 'scripts');
  try {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      fs.writeFileSync(
        path.join(target, name),
        fs.readFileSync(path.join(source, name)),
      );
    }
  } catch (err) {
    console.warn('Could not deploy bundled scripts:', err);
  }
}

deployBundledScripts();

app.use(express.static(distDir));
// SPA fallback: any non-/api path returns index.html
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn('Could not open browser automatically:', err.message);
  });
}

function listen(port: number, attempt = 0): void {
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`Agentic WezTerm Manager running at ${url}`);
    if (process.env.NO_OPEN !== '1') openBrowser(url);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attempt < 10) {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      listen(port + 1, attempt + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

listen(DEFAULT_PORT);
