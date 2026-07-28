// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · l'application vue par un cabinet qui vient d'ouvrir
//   Chaque écran est chargé SANS démonstration et SANS données : aucun ne doit
//   rester blanc, planter, ni déborder de l'écran. Le même parcours est refait
//   en arabe (droite-à-gauche) et sur un téléphone, car c'est là que les mises
//   en page cèdent.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const VERCEL = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const HEAD = (VERCEL.headers.find((h) => h.source === '/(.*)') || {}).headers || [];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

const PORT = 4413, BASE = `http://localhost:${PORT}`;
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  for (const h of HEAD) res.setHeader(h.key, h.value);
  res.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const SCREENS = [
  'home', 'search', 'about', 'forpatients', 'fordoctors', 'contact', 'confidentialite',
  'plogin', 'pregister', 'login', 'docregister', 'forgotpw', 'checkemail', 'verified', 'rxverify',
  'paccount', 'pmessages', 'admin',
  'doctor', 'dcal', 'dnav', 'dtasks', 'dpatients', 'dpfile', 'dappts', 'dprescribe', 'ddocs',
  'dreq', 'dhist', 'dshare', 'dstaff', 'dchat', 'dbill', 'dstats', 'dsettings', 'davail',
  'dstations', 'dsila', 'dabo', 'dnotif', 'dplans',
];
// L'espace médecin est en français ; l'arabe concerne le parcours patient et
// les pages publiques — c'est donc là qu'on teste le sens droite-à-gauche.
const PUBLIC_SCREENS = SCREENS.filter((s) => !s.startsWith('d') || s === 'docregister');
const CASES = [
  { label: 'bureau · français', width: 1440, lang: 'fr', screens: SCREENS },
  { label: 'téléphone · français', width: 390, lang: 'fr', screens: SCREENS },
  { label: 'téléphone · arabe (RTL)', width: 390, lang: 'ar', screens: PUBLIC_SCREENS },
];

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
let problems = 0;

for (const c of CASES) {
  console.log(`\n── ${c.label} ──`);
  const ctx = await browser.newContext({ viewport: { width: c.width, height: 860 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).split('\n')[0]));

  for (const scr of c.screens) {
    errs.length = 0;
    await page.goto(`${BASE}/${scr === 'home' ? '' : scr}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(scr === 'home' ? 1100 : 850);
    if (c.lang === 'ar') {
      const pill = page.locator('button[aria-label="العربية"]').first();
      if (await pill.count()) { await pill.click().catch(() => {}); await page.waitForTimeout(500); }
    }

    const r = await page.evaluate(() => {
      const txt = (document.body.innerText || '').trim();
      const iw = document.documentElement.clientWidth;
      let over = '';
      for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el);
        if (s.position === 'fixed' || s.overflowX === 'auto' || s.overflowX === 'scroll') continue;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > iw + 2) { over = el.tagName + '.' + String(el.className).slice(0, 24); break; }
      }
      return { len: txt.length, head: txt.slice(0, 60).replace(/\s+/g, ' '), over, scrollW: document.documentElement.scrollWidth, iw };
    });

    const bad = [];
    if (errs.length) bad.push('plantage : ' + errs[0].slice(0, 90));
    if (r.len < 40) bad.push(`écran quasi vide (${r.len} caractères)`);
    if (r.scrollW > r.iw + 2) bad.push(`débordement horizontal (${r.scrollW} > ${r.iw}) ${r.over}`);
    if (bad.length) { problems += bad.length; console.log(`  ✗ ${scr} — ${bad.join(' | ')}`); }
  }
  await ctx.close();
}

console.log(`\n════ ${problems} problème(s) ════`);
await browser.close();
server.close();
process.exit(problems ? 1 : 0);
