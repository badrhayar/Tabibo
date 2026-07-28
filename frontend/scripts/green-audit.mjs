// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · un seul vert d'action
//   Parcourt l'application (public + démonstration médecin) et relève CHAQUE
//   élément cliquable dont le fond est vert. Tout ce qui n'est pas exactement
//   la référence — le dégradé du bouton « Rechercher » — est signalé.
//   Les surfaces (rails, en-têtes, bandeaux) sont hors sujet : ce sont des
//   décors, pas des actions.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = 4423, BASE = `http://localhost:${PORT}`;
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  r.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  r.end(readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, r));

const PUBLIC = ['home', 'search', 'profile', 'pinfo', 'confirm', 'about', 'forpatients', 'fordoctors', 'contact', 'plogin', 'pregister', 'login', 'docregister', 'confidentialite', 'paccount', 'pmessages', 'forgotpw', 'checkemail', 'verified', 'admin', 'rxverify'];
const DOCTOR = ['doctor', 'dcal', 'dnav', 'dtasks', 'dpatients', 'dpfile', 'dappts', 'dprescribe', 'ddocs', 'dreq', 'dhist', 'dshare', 'dstaff', 'dchat', 'dbill', 'dstats', 'dsettings', 'davail', 'dstations', 'dsila', 'dabo', 'dnotif', 'dplans'];

// La référence, telle que le navigateur la restitue.
const REF_STOPS = ['26, 174, 116', '18, 135, 90', '11, 106, 70'];   // #1AAE74 #12875A #0B6A46
const isRef = (bg) => REF_STOPS.every((s) => bg.includes(s));

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

const PROBE = (refStops) => {
  // Vert d'ACTION : un vert franc et soutenu. Les teintes claires (pastilles,
  // avatars, fonds de statut) ne sont pas des boutons verts — on les ignore.
  const green = (r, g, b) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return g === max && g - Math.max(r, b) > 15 && max - min > 35 && max < 200;
  };
  const parse = (s) => [...s.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map((m) => [+m[1], +m[2], +m[3]]);
  const out = [];
  const isRefLocal = (bg) => refStops.every((s) => bg.includes(s));
  for (const el of document.querySelectorAll('button, [role="switch"], [role="tab"], label, a')) {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor;
    if (!bg || bg === 'none') continue;
    if (!parse(bg).some(([r, g, b]) => green(r, g, b))) continue;
    if (isRefLocal(bg)) continue;
    out.push({
      bg: bg.slice(0, 120),
      txt: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      tag: el.tagName.toLowerCase() + (el.getAttribute('role') ? '[' + el.getAttribute('role') + ']' : ''),
    });
  }
  return out;
};

const scan = async (label) => {
  const rows = await page.evaluate(PROBE, REF_STOPS);
  if (rows.length) {
    console.log(`\n── ${label} — ${rows.length} élément(s) hors référence`);
    const seen = new Set();
    for (const r of rows) {
      const k = r.bg + r.txt;
      if (seen.has(k)) continue;
      seen.add(k);
      console.log(`   ${r.tag.padEnd(14)} « ${r.txt || '—'} »  →  ${r.bg}`);
    }
  }
  return rows.length;
};

let total = 0;
for (const s of PUBLIC) {
  await page.goto(`${BASE}/${s === 'home' ? '' : s}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(850);
  total += await scan(s);
}

await page.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1300);
const demo = page.locator('text=/Essayer la démo/i').first();
if (await demo.count()) { await demo.click(); await page.waitForTimeout(2600); }
for (const s of DOCTOR) {
  await page.evaluate((x) => { history.pushState({}, '', '/' + x); window.dispatchEvent(new PopStateEvent('popstate')); }, s);
  await page.waitForTimeout(900);
  total += await scan(s);
}

console.log(`\n════ ${total} fond(s) vert(s) hors référence ════`);
if (!total) console.log('   tous les boutons et interrupteurs portent le même vert.');
await browser.close();
srv.close();
process.exit(total ? 1 : 0);
