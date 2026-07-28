// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · les sorties « fichier » sous les en-têtes de production
//   Vérifie que, CSP réelle appliquée, un PDF s'ouvre bien (URL blob dans un
//   nouvel onglet) et qu'une feuille d'impression se compose sans être refusée.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const VERCEL = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const HEAD = (VERCEL.headers.find((h) => h.source === '/(.*)') || {}).headers || [];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

const PORT = 4409, BASE = `http://localhost:${PORT}`;
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  for (const h of HEAD) res.setHeader(h.key, h.value);
  res.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const refused = [];
const watch = (p) => {
  p.on('console', (m) => { const t = m.text(); if (/Refused to|Content Security Policy/i.test(t)) refused.push(t.slice(0, 200)); });
  p.on('pageerror', (e) => refused.push('EXC ' + String(e.message).split('\n')[0]));
};
watch(page);
ctx.on('page', watch);

// Aucune impression réelle possible sans interface : on compte les appels.
await ctx.addInitScript(() => { window.__printed = 0; const p = window.print; window.print = () => { window.__printed++; void p; }; });

await page.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.locator('text=/Essayer la démo/i').first().click();
await page.waitForTimeout(2600);

const go = async (s) => {
  await page.evaluate((x) => { history.pushState({}, '', '/' + x); window.dispatchEvent(new PopStateEvent('popstate')); }, s);
  await page.waitForTimeout(1000);
};

const results = [];
const tryClick = async (screen, rx, label) => {
  await go(screen);
  const b = page.locator(rx).first();
  if (!(await b.count())) { results.push([label, 'bouton absent']); return; }
  const before = ctx.pages().length;
  await b.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2200);
  const opened = ctx.pages().slice(before);
  const urls = opened.map((p) => p.url());
  results.push([label, opened.length ? 'onglet ouvert → ' + urls.join(' ') : 'aucun onglet']);
  for (const p of opened) await p.close().catch(() => {});
};

// 1) Ordonnance → PDF
await go('dprescribe');
await page.locator('input').first().fill('Patient Test').catch(() => {});
const drug = page.locator('input').nth(1);
if (await drug.count()) await drug.fill('Paracétamol 1g').catch(() => {});
await tryClick('dprescribe', 'button:has-text("PDF"), button:has-text("Générer")', 'Ordonnance → PDF');

// 2) Impression de la journée (agenda / rendez-vous)
await go('dappts');
const printBtn = page.locator('button:has-text("Imprimer")').first();
if (await printBtn.count()) {
  const before = ctx.pages().length;
  await printBtn.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const opened = ctx.pages().slice(before);
  results.push(['Imprimer la journée', opened.length ? 'feuille composée dans un nouvel onglet' : 'aucun onglet']);
  for (const p of opened) await p.close().catch(() => {});
} else results.push(['Imprimer la journée', 'bouton absent']);

// 3) Facture
await tryClick('dbill', 'button:has-text("Imprimer"), button:has-text("PDF")', 'Facturation → document');

console.log('\n── sorties fichier (en-têtes de production) ──');
for (const [k, v] of results) console.log(` • ${k} : ${v}`);
console.log(`\n════ refus CSP : ${refused.length} ════`);
for (const r of [...new Set(refused)]) console.log(' ✗', r);

await browser.close();
server.close();
process.exit(refused.length ? 1 : 0);
