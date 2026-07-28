// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · le cas « annuaire qui arrive en retard »
//   Un patient ouvre directement la fiche d'un médecin (lien partagé, QR,
//   rafraîchissement) alors que l'annuaire n'est pas encore chargé. L'écran doit
//   se remplir dès que la réponse du serveur arrive — et surtout ne pas planter.
//   Ce banc intercepte l'appel Supabase et le fait répondre APRÈS l'affichage.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = 4415, BASE = `http://localhost:${PORT}`;
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, BASE).pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const DOCTOR = {
  id: '11111111-1111-4111-8111-111111111111',
  full_name: 'Karim Benali', specialty: 'generaliste', city: 'Casablanca',
  clinic_address: '12 rue Al Massira', fee_mad: 300, languages: ['fr', 'ar'],
  cnss_cnopss: true, teleconsultation: true, bio: 'Médecin généraliste.',
  rating: 4.8, reviews_count: 42, experience_years: 12, map_x: 45, map_y: 55,
  max_per_day: 20, prayer_block: false, prayer_ids: [], services: [],
  avatar_url: null, lat: 33.57, lng: -7.59, slug: 'dr-karim-benali',
  slot_minutes: 30, bio_ar: null, bio_en: null,
  stations: [{ id: 'st_doc', name: 'Dr. Karim Benali', kind: 'doctor' }, { id: 'st_lab', name: 'Laboratoire', kind: 'lab' }],
};

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const crashes = [];
if (process.env.TRACE) page.on('request', (r) => { if (!r.url().startsWith(BASE)) console.log('   →', r.method(), r.url().slice(0, 150)); });
page.on('pageerror', (e) => crashes.push(String(e.message).split('\n')[0]));
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::ERR|CERT/i.test(t)) crashes.push('console: ' + t.slice(0, 260)); });

// Playwright applique la DERNIÈRE règle enregistrée en premier : on pose donc
// d'abord les règles générales, puis la règle précise sur l'annuaire.
await ctx.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
await ctx.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
// L'annuaire, lui, répond après 1,8 s : l'écran est donc rendu une première
// fois SANS médecin, puis une seconde fois avec — la séquence exacte qui
// faisait planter React quand un `return` anticipé sautait des hooks.
await ctx.route('**/rest/v1/doctor_directory*', async (route) => {
  // Cas réel : la recherche par slug est une ligne indexée (rapide), tandis que
  // l'annuaire complet est la requête lente. On modélise les deux séparément.
  const isSlug = /slug=eq\./.test(route.request().url());
  await new Promise((r) => setTimeout(r, isSlug ? Number(process.env.SLUG_DELAY ?? 0) : Number(process.env.DELAY ?? 1800)));
  // `.maybeSingle()` demande un OBJET (en-tête Accept pgrst.object) là où une
  // liste ordinaire attend un TABLEAU : on répond dans la forme demandée,
  // sinon la résolution du lien /dr-slug échouerait pour une raison de banc
  // d'essai et non de code.
  const wantsObject = /pgrst\.object/.test(route.request().headers()['accept'] || '');
  await route.fulfill({
    status: 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(wantsObject ? DOCTOR : [DOCTOR]),
  });
});

const step = async (label, path) => {
  crashes.length = 0;
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);                       // avant la réponse
  const before = (await page.evaluate(() => document.body.innerText)).length;
  // Playwright traite les interceptions l'une après l'autre : deux appels
  // retardés se cumulent. On laisse donc largement le temps aux deux.
  await page.waitForTimeout(5200);                      // après la réponse
  const after = await page.evaluate(() => document.body.innerText);
  const ok = !crashes.length && after.includes('Karim Benali');
  console.log(`  ${ok ? '✓' : '✗'} ${label} — ${before} car. avant réponse, ${after.length} après${crashes.length ? ' | PLANTAGE : ' + crashes[0].slice(0, 110) : ''}`);
  return ok;
};

console.log('\n── annuaire chargé en différé (1,8 s) ──');
let ok = true;
ok = await step('fiche médecin (/dr-karim-benali)', '/dr-karim-benali') && ok;
ok = await step('fiche médecin (/profile)', '/profile') && ok;
ok = await step('page de réservation (/pinfo)', '/pinfo') && ok;

console.log(`\n════ ${ok ? 'aucun plantage — l’écran se remplit à l’arrivée des données' : 'ÉCHEC'} ════`);
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
