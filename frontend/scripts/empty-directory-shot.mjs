// Preuve visuelle : Supabase branché mais annuaire vide (l'état exact de la
// plateforme avant le premier médecin approuvé). Attendu : un état vide franc,
// AUCUN médecin de démonstration, aucun bouton de réservation cliquable.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const DIST = resolve(process.cwd(), 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const server = createServer((req, res) => {
  const p = join(DIST, decodeURIComponent(req.url.split('?')[0]));
  const file = existsSync(p) && extname(p) ? p : join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(4178);

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// Le domaine Supabase est injoignable → fetchDoctors échoue → annuaire vide.
await page.route('**/rest/v1/**', (r) => r.abort());

await page.goto('http://localhost:4178/search', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const body = await page.textContent('body');
const FAKES = ['Karim Benali', 'Leila Marmioui', 'Sara Idrissi', 'Salma El Fassi'];
const leaked = FAKES.filter((n) => body.includes(n));

console.log(leaked.length === 0
  ? '  \x1b[32m✓\x1b[0m aucun médecin de démonstration affiché'
  : `  \x1b[31m✗\x1b[0m médecins fictifs affichés : ${leaked.join(', ')}`);
console.log(/Aucun médecin/.test(body)
  ? '  \x1b[32m✓\x1b[0m état vide franc affiché'
  : '  \x1b[31m✗\x1b[0m pas d\'état vide');

await page.screenshot({ path: 'screenshots/annuaire-vide.png', fullPage: false });
await browser.close();
server.close();
process.exit(leaked.length === 0 ? 0 : 1);
