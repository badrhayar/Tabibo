// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · accessibilité — ce qu'un lecteur d'écran entend
//
//   Trois défauts rendent une application médicale inutilisable à l'aveugle, et
//   tous les trois sont invisibles à l'œil :
//     1. un bouton qui ne contient qu'une icône et rien d'autre — annoncé
//        « bouton », sans plus ;
//     2. un champ de saisie sans intitulé associé — annoncé « zone d'édition » ;
//     3. une image sans texte de remplacement.
//
//   Le banc ouvre chaque écran et compte. Il ne juge pas le style : il vérifie
//   qu'il existe, pour chaque commande, quelque chose à annoncer.
//
//   CE QU'IL NE VOIT PAS, et qu'il faut savoir :
//     · seulement 1440 px — les commandes propres au téléphone (barre d'onglets,
//       menu replié) ne sont pas parcourues ;
//     · seulement l'état initial de chaque écran — une fenêtre modale, un
//       panneau latéral ou un formulaire ouvert au clic échappe au relevé ;
//     · il ne mesure ni le contraste, ni l'ordre de tabulation, ni le piège au
//       clavier dans les fenêtres modales.
//   Un rendu à 0 veut dire « rien de muet à l'arrivée sur l'écran, en grand
//   format » — pas « l'application est accessible ».
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = 4441, BASE = `http://localhost:${PORT}`;
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  r.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  r.end(readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, r));

const PUBLIC = ['home', 'search', 'fordoctors', 'forpatients', 'about', 'contact',
  'login', 'signup', 'plogin', 'pregister', 'forgotpw', 'confidentialite'];
const DOCTOR = ['doctor', 'dcal', 'dnav', 'dtasks', 'dpatients', 'dpfile', 'dappts',
  'dprescribe', 'ddocs', 'dreq', 'dhist', 'dshare', 'dstaff', 'dchat', 'dbill',
  'dstats', 'dsettings', 'davail', 'dstations', 'dnetwork', 'dabo', 'dnotif', 'dplans'];

const SCAN = () => {
  const out = { mute: [], field: [], img: [] };
  const named = (el) => {
    const t = (el.innerText || el.textContent || '').trim();
    if (t) return true;
    for (const a of ['aria-label', 'title', 'aria-labelledby', 'alt']) if (el.getAttribute(a)) return true;
    return false;
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = (el) => el.outerHTML.slice(0, 90).replace(/\s+/g, ' ');

  for (const el of document.querySelectorAll('button, [role="button"], a')) {
    if (!visible(el) || named(el)) continue;
    out.mute.push(label(el));
  }
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (!visible(el)) continue;
    if (el.type === 'hidden') continue;
    const id = el.getAttribute('id');
    const hasLabel = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest('label');
    if (hasLabel || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
        || el.getAttribute('placeholder') || el.getAttribute('title')) continue;
    out.field.push(label(el));
  }
  for (const el of document.querySelectorAll('img')) {
    if (!visible(el) || el.hasAttribute('alt')) continue;
    out.img.push(label(el));
  }
  return out;
};

const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();

let total = 0;
const report = (screen, r) => {
  const n = r.mute.length + r.field.length + r.img.length;
  if (!n) return;
  total += n;
  console.log(`\n  ✗ ${screen}`);
  for (const x of r.mute)  console.log(`      commande sans intitulé : ${x}`);
  for (const x of r.field) console.log(`      champ sans intitulé    : ${x}`);
  for (const x of r.img)   console.log(`      image sans alt         : ${x}`);
};

console.log('\n── Écrans publics ──');
for (const s of PUBLIC) {
  await p.goto(`${BASE}/${s === 'home' ? '' : s}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  report(s, await p.evaluate(SCAN));
}

console.log('\n── Espace médecin (démonstration) ──');
await p.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
await p.locator('text=/Essayer la démo/i').first().click();
await p.waitForTimeout(2600);
for (const s of DOCTOR) {
  await p.evaluate((x) => { history.pushState({}, '', '/' + x); window.dispatchEvent(new PopStateEvent('popstate')); }, s);
  await p.waitForTimeout(900);
  report(s, await p.evaluate(SCAN));
}

console.log(`\n════ ${total === 0 ? 'tout élément interactif a un intitulé' : `${total} élément(s) muet(s)`} ════`);
await b.close();
srv.close();
process.exit(total === 0 ? 0 : 1);
