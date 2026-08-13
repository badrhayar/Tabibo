// ════════════════════════════════════════════════════════════════════════════
// Banc · Surveillance d'erreurs
//
//  Une table d'exploitation qui recopie un numéro de téléphone ou un courriel
//  de patient est une fuite de données de santé, pas un outil de diagnostic.
//  Ce banc charge le VRAI lib/monitor.js avec un faux client Supabase et
//  inspecte ce qui serait réellement inséré.
//
//  Il vérifie aussi que les chemins d'écriture critiques de lib/api.js sont
//  bien instrumentés : sans cela, une réservation refusée reste invisible.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
let failures = 0;
const ok = (m) => console.log('  \x1b[32m✓\x1b[0m ' + m);
const ko = (m) => { failures++; console.log('  \x1b[31m✗\x1b[0m ' + m); };

// ── Faux environnement navigateur + faux client Supabase ────────────────────
const inserted = [];
globalThis.__APP_VERSION__ = 'tabibo-vTEST';
globalThis.location = { origin: 'https://tabibo.ma', pathname: '/pregister' };
// Node 22 expose `navigator` en lecture seule — on le redéfinit.
Object.defineProperty(globalThis, 'navigator', {
  configurable: true, writable: true,
  value: { userAgent: 'node-bench', onLine: true },
});
globalThis.sessionStorage = { getItem: () => 'pinfo', setItem: () => {} };
globalThis.window = { addEventListener: () => {} };

// Le module importe ./supabaseClient : on l'intercepte par un loader minimal.
const { register } = await import('node:module');
const stubUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const isSupabaseConfigured = true;
  export const supabase = { from: () => ({ insert: (row) => { globalThis.__ins.push(row); return Promise.resolve({}); } }) };
`);
globalThis.__ins = inserted;

// Plutôt qu'un loader (fragile selon les versions de Node), on réécrit
// l'import à la volée : le code testé reste celui du dépôt, à une ligne près.
const src = readFileSync(resolve(root, 'src/lib/monitor.js'), 'utf8')
  .replace("from './supabaseClient'", `from '${stubUrl}'`);
const monitor = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

console.log('\n\x1b[1mSurveillance d\'erreurs\x1b[0m');

// ── 1. Épuration des données personnelles ───────────────────────────────────
console.log('\n  Épuration');
const LEAKS = [
  ['courriel',   'duplicate key … Key (email)=(fatima.zahra@gmail.com) already exists', 'fatima.zahra@gmail.com'],
  ['téléphone',  'invalid phone +212 661 23 45 67 for patient',                          '661'],
  ['tél. local', 'échec envoi vers 0661234567',                                          '0661234567'],
  ['CIN',        'contrainte violée : cin_or_inpe = AB123456789',                        '123456789'],
  ['RIB',        'virement 230 810 0000000000000000 12 rejeté',                          '0000000000000000'],
  ['jeton',      'bad JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc',                     'eyJhbGciOiJIUzI1NiJ9'],
];
for (const [label, message, secret] of LEAKS) {
  inserted.length = 0;
  monitor.reportHandledError('bench_' + label, { message });
  const row = inserted[0];
  if (!row) { ko(`${label} — rien inséré`); continue; }
  if (String(row.message).includes(secret)) ko(`${label} — la donnée FUIT : ${row.message}`);
  else ok(`${label} — masqué → « ${row.message} »`);
}

// ── 2. Contexte de triage ───────────────────────────────────────────────────
console.log('\n  Contexte');
inserted.length = 0;
monitor.setMonitorRole('doctor');
monitor.reportHandledError('createAppointment', { message: 'row-level security', code: '42501' });
const r = inserted[0] || {};
r.kind === 'handled'            ? ok('kind = handled')                : ko(`kind = ${r.kind}`);
r.context === 'createAppointment' ? ok('context = createAppointment')  : ko(`context = ${r.context}`);
r.app_version === 'tabibo-vTEST' ? ok('version de build présente')     : ko(`version = ${r.app_version}`);
r.user_role === 'doctor'         ? ok('rôle = doctor')                 : ko(`rôle = ${r.user_role}`);
String(r.message).includes('[42501]') ? ok('code Postgres en tête du message') : ko('code Postgres absent');
r.url === 'https://tabibo.ma/pregister' ? ok('URL sans chaîne de requête') : ko(`url = ${r.url}`);
'user_id' in r ? ko('un identifiant d\'utilisateur est stocké — il ne doit pas l\'être') : ok('aucun identifiant d\'utilisateur stocké');

// ── 3. Bornes ───────────────────────────────────────────────────────────────
console.log('\n  Bornes');
inserted.length = 0;
for (let i = 0; i < 5; i++) monitor.reportHandledError('bench_dedup', { message: 'même erreur' });
inserted.length === 1 ? ok('déduplication : 5 rapports identiques → 1 insertion') : ko(`déduplication cassée (${inserted.length})`);

inserted.length = 0;
for (let i = 0; i < 60; i++) monitor.reportHandledError('bench_cap_' + i, { message: 'e' + i });
inserted.length <= 25 ? ok(`plafond par session respecté (${inserted.length} ≤ 25)`) : ko(`plafond dépassé (${inserted.length})`);

inserted.length = 0;
globalThis.navigator.onLine = false;
monitor.reportHandledError('bench_offline', { message: 'Failed to fetch' });
globalThis.navigator.onLine = true;
inserted.length === 0 ? ok('hors ligne : rien remonté (pas de bruit dans les tunnels)') : ko('rapport émis hors ligne');

// ── 4. Chemins critiques instrumentés ───────────────────────────────────────
console.log('\n  Chemins critiques de lib/api.js');
const api = readFileSync(resolve(root, 'src/lib/api.js'), 'utf8');
const CRITICAL = ['createAppointment', 'createWalkinAppointment', 'updateAppointmentStatus',
  'updateAppointment', 'sendMessage', 'uploadDocument', 'createDoctorProfile',
  'declarePayment', 'createInvoice', 'uploadCredential', 'guestBookingStart', 'guestBookingVerify'];
for (const fn of CRITICAL) {
  const wired = api.includes(`failed('${fn}'`) || api.includes(`reportHandledError('${fn}'`);
  wired ? ok(fn) : ko(`${fn} — échec silencieux : aucun rapport`);
}

// ── 5. La colonne existe bien en base ───────────────────────────────────────
console.log('\n  Migration');
const mig = readFileSync(resolve(root, '../supabase/migrations/20260806120000_client_errors_context.sql'), 'utf8');
for (const col of ['kind', 'context', 'app_version', 'user_role']) {
  mig.includes(col) ? ok(`colonne ${col}`) : ko(`colonne ${col} absente de la migration`);
}

console.log(failures === 0 ? '\n\x1b[32m✓ Surveillance : tout est vert\x1b[0m\n'
                           : `\n\x1b[31m✗ ${failures} échec(s)\x1b[0m\n`);
process.exit(failures === 0 ? 1 && 0 : 1);
