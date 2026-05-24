import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// For local dev: load .env from repo root if vars aren't already in process.env.
// On Vercel, env vars come from the dashboard and process.env is already populated.
function loadDotEnv() {
  const candidates = [join(__dirname, '../../.env'), join(__dirname, '.env.local')];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
    break;
  }
}
loadDotEnv();

const GA_ID = process.env.GA_MEASUREMENT_ID;
const SITE_VER = process.env.GOOGLE_SITE_VERIFICATION;

if (!GA_ID) console.warn('WARNING: GA_MEASUREMENT_ID is not set');
if (!SITE_VER) console.warn('WARNING: GOOGLE_SITE_VERIFICATION is not set');

const SRC = __dirname;
const DIST = join(__dirname, 'dist');

rmSync(DIST, { recursive: true, force: true });

// api/ is a Vercel serverless functions directory — Vercel picks it up from the
// project root automatically, so it must not be copied into the static output.
const SKIP = new Set(['dist', 'build.mjs', 'api', 'node_modules', 'vercel.json']);

function build(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (entry.startsWith('.') || SKIP.has(entry)) continue;
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      build(srcPath, destPath);
    } else if (entry.endsWith('.backup.html')) {
      // skip backup files
    } else if (extname(entry) === '.html') {
      const html = readFileSync(srcPath, 'utf8')
        .replaceAll('{{GA_MEASUREMENT_ID}}', GA_ID ?? '')
        .replaceAll('{{GOOGLE_SITE_VERIFICATION}}', SITE_VER ?? '');
      writeFileSync(destPath, html, 'utf8');
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

build(SRC, DIST);
console.log('Build complete → dist/');
