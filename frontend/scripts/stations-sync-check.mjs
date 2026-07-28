// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · les postes de soins disent-ils la même chose partout ?
//   Le médecin écrit ses postes dans Paramètres. Le secrétariat (fenêtre
//   « Nouveau rendez-vous ») et le patient (page de réservation) doivent voir
//   EXACTEMENT ces libellés — ni plus, ni moins, ni d'autres.
//   Le banc simule un cabinet dont la base contient une liste précise, puis
//   compare les trois écrans.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = 4435, BASE = `http://localhost:${PORT}`;
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  r.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  r.end(readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, r));

// Les postes tels que le médecin les aurait écrits — noms libres, types variés.
const STATIONS = [
  { id: 'st_1', name: 'Dr. Mohammed',        kind: 'doctor' },
  { id: 'st_2', name: 'Aïcha — assistante',  kind: 'assist' },
  { id: 'st_3', name: 'Laboratoire',         kind: 'lab' },
  { id: 'st_4', name: 'Salle de soins',      kind: 'care' },
];
const DOCTOR = {
  id: '11111111-1111-4111-8111-111111111111', full_name: 'Karim Benali', specialty: 'generaliste',
  city: 'Casablanca', clinic_address: '12 rue Al Massira', fee_mad: 300, languages: ['fr'],
  cnss_cnopss: true, teleconsultation: true, bio: '', rating: 4.8, reviews_count: 42,
  experience_years: 12, map_x: 45, map_y: 55, max_per_day: 20, prayer_block: false,
  prayer_ids: [], services: [], avatar_url: null, lat: 33.57, lng: -7.59,
  slug: 'dr-karim-benali', slot_minutes: 30, bio_ar: null, bio_en: null, stations: STATIONS,
};

const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
await ctx.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
await ctx.route('**/rest/v1/doctor_directory*', (r) => {
  const obj = /pgrst\.object/.test(r.request().headers()['accept'] || '');
  r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(obj ? DOCTOR : [DOCTOR]) });
});

const p = await ctx.newPage();
const expected = STATIONS.map((s) => s.name);
let ok = true;
const check = (label, got) => {
  const same = got.length === expected.length && expected.every((e, i) => got[i] === e);
  if (!same) ok = false;
  console.log(`  ${same ? '✓' : '✗'} ${label}\n      attendu : ${JSON.stringify(expected)}\n      obtenu  : ${JSON.stringify(got)}`);
};

// ── Côté patient : la page de réservation ─────────────────────────────────
await p.goto(BASE + '/pinfo', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2600);
const patientOpts = await p.evaluate(() => {
  const sel = [...document.querySelectorAll('select')]
    .find((s) => [...s.options].some((o) => /Peu importe/.test(o.textContent)));
  return sel ? [...sel.options].map((o) => o.textContent.trim()).slice(1) : [];
});
console.log('\n── Ce que voit le PATIENT à la réservation ──');
check('page de réservation', patientOpts);

// ── Côté cabinet : la fenêtre « Nouveau rendez-vous » ─────────────────────
// On entre en démonstration puis on injecte la même liste dans l'état du
// cabinet, exactement comme le ferait un enregistrement depuis Paramètres.
await p.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
// On dépose la liste AVANT d'entrer en démonstration : recharger la page
// ferait perdre l'état de la démo.
await p.evaluate((list) => {
  try { localStorage.setItem('tabibo_stations_demo', JSON.stringify(list)); } catch { /* mode privé */ }
}, STATIONS);
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.locator('text=/Essayer la démo/i').first().click();
await p.waitForTimeout(2800);
await p.locator('button:has-text("Nouveau rendez-vous")').first().click();
await p.waitForTimeout(900);
const deskOpts = await p.evaluate(() => {
  const sel = [...document.querySelectorAll('select')]
    .find((s) => [...s.options].some((o) => /Aucun poste|Peu importe|Poste/.test(o.textContent)));
  return sel ? [...sel.options].map((o) => o.textContent.trim()).slice(1) : [];
});
console.log('\n── Ce que voit le SECRÉTARIAT en créant un rendez-vous ──');
check('fenêtre « Nouveau rendez-vous »', deskOpts);

console.log(`\n════ ${ok ? 'les trois écrans affichent la même liste' : 'DIVERGENCE entre les écrans'} ════`);
await b.close();
srv.close();
process.exit(ok ? 0 : 1);
