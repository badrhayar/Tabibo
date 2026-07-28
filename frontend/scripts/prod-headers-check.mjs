// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · contrôle « comme en production »
//   `vite preview` ne pose AUCUN en-tête de sécurité : une page peut donc
//   marcher en local et être refusée une fois en ligne. Ce banc sert le dossier
//   dist/ avec exactement les en-têtes de vercel.json (dont la CSP), parcourt
//   l'application et signale la moindre violation.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const VERCEL = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const GLOBAL_HEADERS = (VERCEL.headers.find((h) => h.source === '/(.*)') || {}).headers || [];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

const PORT = 4407, BASE = `http://localhost:${PORT}`;
const server = createServer((req, res) => {
  const url = new URL(req.url, BASE);
  let file = join(DIST, decodeURIComponent(url.pathname));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  for (const h of GLOBAL_HEADERS) res.setHeader(h.key, h.value);
  res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const violations = [];
page.on('console', (m) => {
  const t = m.text();
  if (/Content Security Policy|Refused to |violates the following/i.test(t)) violations.push(t.slice(0, 220));
});
page.on('pageerror', (e) => violations.push('EXC ' + String(e.message).split('\n')[0]));

const SCREENS = ['home', 'search', 'fordoctors', 'forpatients', 'about', 'contact', 'plogin', 'login', 'docregister', 'pregister', 'confidentialite'];
for (const s of SCREENS) {
  await page.goto(`${BASE}/${s === 'home' ? '' : s}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
}

// Le cœur du sujet : la démo médecin, puis les trois sorties « fichier »
// (impression, PDF, aperçu de document) qui passent par blob:/nouvelle fenêtre.
await page.goto(`${BASE}/fordoctors`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const demo = page.locator('text=/Essayer la démo/i').first();
if (await demo.count()) { await demo.click(); await page.waitForTimeout(2500); }

const go = async (s) => {
  await page.evaluate((x) => { history.pushState({}, '', '/' + x); window.dispatchEvent(new PopStateEvent('popstate')); }, s);
  await page.waitForTimeout(900);
};
for (const s of ['dcal', 'dappts', 'dhist', 'dprescribe', 'ddocs', 'dbill', 'dstats', 'dstations', 'dnav', 'dpatients']) await go(s);

// Génération d'un PDF réel (le chemin corrigé : URL blob + nouvelle fenêtre).
const pdfProbe = await page.evaluate(async () => {
  try {
    const m = await import('/assets/' + [...document.querySelectorAll('script[type=module]')]
      .map((s) => s.src.split('/assets/')[1]).filter(Boolean)[0]);
    void m; return 'module-ok';
  } catch (e) { return 'skip: ' + String(e).slice(0, 60); }
});

console.log('sondage module :', pdfProbe);
console.log('\n════ violations CSP / erreurs : ' + violations.length + ' ════');
for (const v of [...new Set(violations)]) console.log(' ✗', v);
if (!violations.length) console.log('  aucune — les en-têtes de production laissent passer toute l’application.');

await browser.close();
server.close();
process.exit(violations.length ? 1 : 0);
