// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · plus un seul mot en capitales
//   Règle : un libellé garde sa majuscule initiale, jamais davantage. Ni par
//   `text-transform`, ni écrit tel quel dans le code.
//   Le banc ouvre l'application pour de vrai et lit ce que le navigateur
//   affiche : c'est le rendu qui compte, pas l'intention du style.
//   Les sigles (CIN, AMO, CNSS, MAD…) restent des sigles — ils sont autorisés.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = 4438, BASE = `http://localhost:${PORT}`;
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  r.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  r.end(readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, r));

const PUBLIC = ['home', 'search', 'fordoctors', 'contact', 'login', 'signup'];
const DOCTOR = ['doctor', 'dcal', 'dnav', 'dtasks', 'dpatients', 'dpfile', 'dappts', 'dprescribe',
  'ddocs', 'dreq', 'dhist', 'dshare', 'dstaff', 'dchat', 'dbill', 'dstats', 'dsettings',
  'davail', 'dstations', 'dnetwork', 'dabo', 'dnotif', 'dplans'];

// Ce qui a le droit d'être tout en capitales : les sigles et les raisons
// sociales. Tout le reste doit garder sa seule majuscule initiale.
const ALLOWED = new Set([
  'CIN', 'AMO', 'MAD', 'CNSS', 'CNOPS', 'IMC', 'PA', 'RDV', 'IA', 'AI', 'INPE', 'PDF', 'QR',
  'TVA', 'ICE', 'RIB', 'IBAN', 'SMS', 'ECG', 'IRM', 'DHS', 'CNDP', 'RGPD', 'OK', 'ID', 'URL',
  'HTML', 'CSS', 'API', 'GPS', 'CSV', 'XML', 'JSON', 'HTTP', 'HTTPS', 'TABIBO',
  'CAPTCHA', 'SARL', 'CNOM', 'ORL', 'MPR', 'RMA', 'AXA', 'SAAS', 'CNIL', 'OMS',
]);

const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();

// Lit tous les nœuds de texte visibles et retient ceux qui n'ont plus une seule
// minuscule alors qu'ils comptent au moins deux lettres.
const SCAN = (allowed) => {
  const bad = [];
  const seen = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const el = n.parentElement;
    if (!el) continue;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG') continue;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
    // Le texte rendu : la capitalisation CSS comprise.
    let txt = n.nodeValue || '';
    if (st.textTransform === 'uppercase') txt = txt.toUpperCase();
    const caps = [];
    for (const word of txt.split(/[^\p{L}\p{N}'’-]+/u)) {
      const w = word.replace(/['’-]/g, '');
      if (w.length < 2) continue;
      if (/\p{N}/u.test(w)) continue;            // un chiffre : référence, pas un mot
      if (!/\p{Lu}/u.test(w)) continue;          // aucune majuscule : rien à dire
      if (/\p{Ll}/u.test(w)) continue;           // au moins une minuscule : conforme
      if (allowed.includes(w)) continue;         // sigle admis
      caps.push(w);
    }
    // Un mot isolé de trois lettres ou moins, c'est une initiale d'avatar ou un
    // sigle métier. On signale un mot long, ou une suite de mots : une phrase.
    const flag = caps.filter((w) => w.length >= 4);
    if (!flag.length && caps.length < 2) continue;
    for (const w of (flag.length ? flag : caps)) {
      const key = w + '|' + (el.className || tag);
      if (seen.has(key)) continue;
      seen.add(key);
      bad.push({ word: w, tag, text: txt.trim().slice(0, 60), transform: st.textTransform });
    }
  }
  return bad;
};

const allowed = [...ALLOWED];
let total = 0;
const report = (screen, bad) => {
  if (!bad.length) return;
  total += bad.length;
  console.log(`\n  ✗ ${screen}`);
  for (const x of bad) console.log(`      « ${x.word} »  dans « ${x.text} »${x.transform === 'uppercase' ? '  (text-transform)' : ''}`);
};

console.log('\n── Écrans publics ──');
for (const s of PUBLIC) {
  await p.goto(`${BASE}/${s === 'home' ? '' : s}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  report(s, await p.evaluate(SCAN, allowed));
}

console.log('\n── Espace médecin (démonstration) ──');
await p.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
await p.locator('text=/Essayer la démo/i').first().click();
await p.waitForTimeout(2600);
for (const s of DOCTOR) {
  await p.evaluate((x) => { history.pushState({}, '', '/' + x); window.dispatchEvent(new PopStateEvent('popstate')); }, s);
  await p.waitForTimeout(950);
  report(s, await p.evaluate(SCAN, allowed));
}

console.log(`\n════ ${total === 0 ? 'aucun mot en capitales' : `${total} mot(s) en capitales`} ════`);
await b.close();
srv.close();
process.exit(total === 0 ? 0 : 1);
