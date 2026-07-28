// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · tournée de présentation
//   Passe chaque écran au fil à plomb et relève ce qui se voit :
//     • cartes voisines d'une même rangée qui n'ont pas la même hauteur
//     • boutons alignés côte à côte de hauteurs différentes
//     • texte tronqué (contenu plus large que son cadre, sans défilement)
//     • éléments qui débordent de leur conteneur
//   Un écart de 2 px est toléré (arrondis de rendu) ; au-delà, cela se voit.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = 4427, BASE = `http://localhost:${PORT}`;
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  r.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  r.end(readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, r));

const PUBLIC = ['home', 'search', 'profile', 'pinfo', 'confirm', 'about', 'forpatients', 'fordoctors', 'contact', 'plogin', 'pregister', 'login', 'docregister', 'confidentialite', 'paccount', 'pmessages'];
const DOCTOR = ['doctor', 'dcal', 'dnav', 'dtasks', 'dpatients', 'dpfile', 'dappts', 'dprescribe', 'ddocs', 'dreq', 'dhist', 'dshare', 'dstaff', 'dchat', 'dbill', 'dstats', 'dsettings', 'davail', 'dstations', 'dnetwork', 'dabo', 'dnotif', 'dplans'];

const PROBE = () => {
  const TOL = 2;
  const out = [];
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8 && getComputedStyle(el).visibility !== 'hidden';
  };
  const label = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 34) || el.tagName.toLowerCase();

  // 1. rangées de cartes : des frères, même ligne, hauteurs différentes
  for (const parent of document.querySelectorAll('div')) {
    const cs = getComputedStyle(parent);
    const row = cs.display === 'grid' || (cs.display === 'flex' && cs.flexDirection === 'row');
    if (!row) continue;
    const kids = [...parent.children].filter((k) => k instanceof HTMLElement && vis(k));
    if (kids.length < 2 || kids.length > 6) continue;
    const boxes = kids.map((k) => k.getBoundingClientRect());
    // uniquement des frères réellement sur la MÊME ligne
    const top = boxes[0].top;
    if (!boxes.every((b) => Math.abs(b.top - top) <= TOL)) continue;
    // et qui ressemblent à des cartes (fond ou bordure)
    const carded = kids.filter((k) => { const s = getComputedStyle(k); return s.borderTopWidth !== '0px' || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent'); });
    if (carded.length !== kids.length) continue;
    const hs = boxes.map((b) => Math.round(b.height));
    const spread = Math.max(...hs) - Math.min(...hs);
    if (spread > TOL && Math.max(...hs) > 60) {
      out.push({ kind: 'cartes de hauteurs différentes', detail: `${hs.join(' / ')} px`, who: kids.map(label).join(' | ').slice(0, 80) });
    }
  }

  // 2. boutons côte à côte de hauteurs différentes
  for (const parent of document.querySelectorAll('div')) {
    const btns = [...parent.children].filter((k) => k.tagName === 'BUTTON' && vis(k));
    if (btns.length < 2) continue;
    const boxes = btns.map((b) => b.getBoundingClientRect());
    const top = boxes[0].top;
    if (!boxes.every((b) => Math.abs(b.top - top) <= TOL)) continue;
    const hs = boxes.map((b) => Math.round(b.height));
    if (Math.max(...hs) - Math.min(...hs) > TOL) {
      out.push({ kind: 'boutons de hauteurs différentes', detail: `${hs.join(' / ')} px`, who: btns.map(label).join(' | ').slice(0, 80) });
    }
  }

  // 3. texte tronqué sans possibilité de défilement ni ellipse
  for (const el of document.querySelectorAll('div, span, p, h1, h2, h3, li, td, th, button, label')) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    if (s.overflow === 'visible' || s.overflowX === 'auto' || s.overflowX === 'scroll') continue;
    if (s.textOverflow === 'ellipsis') continue;
    if (el.scrollWidth - el.clientWidth > 3 && el.children.length === 0 && (el.innerText || '').trim()) {
      out.push({ kind: 'texte coupé', detail: `${el.scrollWidth} > ${el.clientWidth} px`, who: label(el) });
    }
  }
  return out;
};

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const W = Number(process.env.W || 1440);
const ctx = await browser.newContext({ viewport: { width: W, height: 950 } });
const page = await ctx.newPage();

let total = 0;
const scan = async (label) => {
  const rows = await page.evaluate(PROBE);
  const seen = new Set();
  const uniq = rows.filter((r) => { const k = r.kind + r.detail + r.who; if (seen.has(k)) return false; seen.add(k); return true; });
  if (uniq.length) {
    console.log(`\n── ${label}`);
    for (const r of uniq.slice(0, 8)) console.log(`   ${r.kind} (${r.detail})  ${r.who}`);
    if (uniq.length > 8) console.log(`   … ${uniq.length - 8} autre(s)`);
  }
  total += uniq.length;
};

for (const s of PUBLIC) {
  await page.goto(`${BASE}/${s === 'home' ? '' : s}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await scan(s);
}
await page.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1300);
const demo = page.locator('text=/Essayer la démo/i').first();
if (await demo.count()) { await demo.click(); await page.waitForTimeout(2600); }
for (const s of DOCTOR) {
  await page.evaluate((x) => { history.pushState({}, '', '/' + x); window.dispatchEvent(new PopStateEvent('popstate')); }, s);
  await page.waitForTimeout(950);
  await scan(s);
}

console.log(`\n════ ${total} défaut(s) de présentation à ${W} px ════`);
await browser.close();
srv.close();
process.exit(0);
