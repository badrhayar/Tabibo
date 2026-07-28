// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · les visuels de la page « pour les médecins »
//
//   La page de vente ne montre plus des dessins : elle montre l'application.
//   Ce script ouvre la démonstration, va sur chaque écran, masque le bandeau de
//   démonstration et la barre du haut, puis photographie la zone de contenu.
//
//   À relancer après toute refonte visuelle :
//       npm run shots
//   Les images atterrissent dans public/ecrans/ et sont servies telles quelles.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const OUT = new URL('../public/ecrans/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const PORT = 4471, BASE = `http://localhost:${PORT}`;
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  r.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  r.end(readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, r));

// Chaque visuel : l'écran, les clics à faire avant la photo, et la hauteur utile.
// On photographie l'écran ENTIER : un cadrage serré couperait une colonne au
// milieu, et une capture tronquée se voit tout de suite. `h` borne seulement la
// hauteur, pour que la vignette garde une proportion de fenêtre.
const TARGETS = [
  { name: 'agenda',        screen: 'dcal',      h: 600 },
  { name: 'navigateur',    screen: 'dnav',      h: 540 },
  { name: 'demandes',      screen: 'dreq',      h: 540 },
  { name: 'rappels',       screen: 'dnotif',    h: 540 },
  { name: 'prevention',    screen: 'dpfile',    clicks: ['text=/Fatima/i', 'text=/^Prévention$/'], h: 540 },
  { name: 'consultation',  screen: 'dpfile',    clicks: ['text=/Fatima/i'], h: 580 },
  { name: 'reseau',        screen: 'dnetwork',  clicks: ["button:has-text('Messagerie')~~1", 'text=/Nadia El Amrani/'], h: 580 },
  { name: 'donnees',       screen: 'dsettings', h: 560 },
  // En dernier : recharger la page publique efface la démonstration.
  { name: 'profil-public', url: '/dr-karim-benali', h: 620, public: true },
];

// Ce qu'on ne photographie jamais : le bandeau de démonstration et la barre du
// haut. Ils n'ont rien à faire sur une page de présentation.
const HIDE = `
  [data-demo-banner], .demo-banner { display: none !important; }
  ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
`;

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
await page.addStyleTag({ content: HIDE }).catch(() => {});

// Entrée en démonstration, une seule fois.
await page.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.locator('text=/Essayer la démo/i').first().click();
await page.waitForTimeout(2800);

/** La zone de contenu : tout ce qui est à droite des rails, sous les bandeaux. */
const contentBox = async (isPublic) => page.evaluate((pub) => {
  if (pub) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  // Le fond d'écran d'un écran médecin porte toujours min-height:100vh.
  const cands = [...document.querySelectorAll('div')]
    .filter((d) => /min-height:\s*100vh/.test(d.getAttribute('style') || ''))
    .map((d) => d.getBoundingClientRect())
    .filter((r) => r.width > 500 && r.height > 200);
  if (!cands.length) return { x: 340, y: 110, w: window.innerWidth - 340, h: window.innerHeight - 110 };
  const r = cands.reduce((a, b) => (b.x > a.x ? b : a));
  return { x: Math.round(r.x), y: Math.round(Math.max(r.y, 0)), w: Math.round(r.width), h: Math.round(r.height) };
}, isPublic);

for (const t of TARGETS) {
  if (t.public) await page.goto(BASE + t.url, { waitUntil: 'domcontentloaded' });
  else await page.evaluate((s) => { history.pushState({}, '', '/' + s); window.dispatchEvent(new PopStateEvent('popstate')); }, t.screen);
  await page.waitForTimeout(1600);

  for (const c of t.clicks || []) {
    let sel = c, idx = 0;
    const m = sel.match(/~~(\d+)$/);
    if (m) { idx = Number(m[1]); sel = sel.slice(0, m.index); }
    await page.locator(sel).nth(idx).click({ timeout: 5000 }).catch(() => console.log(`   (clic « ${c} » ignoré)`));
    await page.waitForTimeout(900);
  }
  await page.addStyleTag({ content: HIDE }).catch(() => {});
  await page.waitForTimeout(400);

  const box = await contentBox(t.public);
  const clip = {
    x: box.x, y: box.y,
    width: Math.min(box.w, 1500 - box.x),
    height: Math.min(t.h, 1000 - box.y),
  };
  const buf = await page.screenshot({ clip, type: 'jpeg', quality: 82 });
  writeFileSync(join(OUT, `${t.name}.jpg`), buf);
  console.log(`  ✓ ${t.name}.jpg — ${clip.width}×${clip.height} · ${Math.round(buf.length / 1024)} Ko`);
}

const total = readdirSync(OUT).reduce((s, f) => s + statSync(join(OUT, f)).size, 0);
console.log(`\n════ ${readdirSync(OUT).length} visuels · ${Math.round(total / 1024)} Ko au total ════`);
await browser.close();
srv.close();
