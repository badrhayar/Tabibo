// ════════════════════════════════════════════════════════════════════════════
// Banc · Intégrité des données affichées
//
//  Né d'un vrai incident : l'annuaire réel étant vide (aucun médecin encore
//  approuvé — l'état normal d'une plateforme le jour de son ouverture), le
//  contexte basculait sur vingt médecins de démonstration aux identifiants
//  numériques. Le patient parcourait un annuaire crédible, remplissait tout le
//  formulaire, et la réservation mourait au dernier clic sur
//  « invalid input syntax for type uuid: "2" ».
//
//  Les cinq écrans consommateurs avaient pourtant la BONNE garde. Le défaut
//  était en amont : le contexte remplissait `state.doctors` de fausses données,
//  donc la garde `state.doctors?.length ?` ne se déclenchait jamais. Une défense
//  posée à la mauvaise couche ne défend rien — ce banc vérifie la bonne.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (m) => console.log('  \x1b[32m✓\x1b[0m ' + m);
const ko = (m) => { failures++; console.log('  \x1b[31m✗\x1b[0m ' + m); };
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

console.log('\n\x1b[1mIntégrité des données affichées\x1b[0m');

// ── 1. Le contexte ne fabrique jamais d'annuaire ────────────────────────────
console.log('\n  Contexte');
const ctx = read('src/context/AppContext.jsx');
const block = ctx.slice(ctx.indexOf('const docs = await fetchDoctors()'),
                        ctx.indexOf('MOCK_DOCTORS, doctorsLoaded: true }'));
block.includes('return;')
  ? ok('la branche Supabase se termine par un return — le repli est hors d\'atteinte')
  : ko('le repli sur les médecins de démonstration reste atteignable avec Supabase branché');

/\bdispatch\(\{\s*doctors:\s*docs,\s*doctorsLoaded/.test(ctx)
  ? ok('un annuaire vide est dispatché tel quel (vérité désagréable > annuaire faux)')
  : ko('l\'annuaire vide n\'est pas propagé');

// ── 2. Chaque écran consommateur garde le mode vitrine ──────────────────────
console.log('\n  Écrans consommateurs de l\'annuaire');
for (const f of ['src/pages/Search.jsx', 'src/pages/Profile.jsx', 'src/pages/BookingInfo.jsx',
                 'src/pages/Confirm.jsx', 'src/pages/Landing.jsx']) {
  const src = read(f);
  if (!src.includes('state.doctors')) { ok(`${f} — n'utilise pas l'annuaire`); continue; }
  /isSupabaseConfigured \? \[\] : DOCTORS/.test(src)
    ? ok(`${f} — repli réservé au mode vitrine`)
    : ko(`${f} — peut afficher des médecins de démonstration en production`);
}

// ── 2b. Aucune donnée fabriquée dans l'état initial ─────────────────────────
console.log('\n  État initial');
/patients:\s*isSupabaseConfigured \? \[\] : DEMO_PATIENTS/.test(ctx)
  ? ok('registre patients vide en production')
  : ko('le registre patients est amorcé avec des patients de démonstration');

// ── 3. Les identifiants sont contrôlés avant le réseau ──────────────────────
console.log('\n  Barrière UUID');
const api = read('src/lib/api.js');
for (const [fn, fields] of [['createAppointment', ['patient', 'médecin']],
                            ['createWalkinAppointment', ['médecin']]]) {
  const i = api.indexOf(`export async function ${fn}`);
  const body = api.slice(i, api.indexOf('\nexport ', i + 10));
  for (const field of fields) {
    body.includes(`assertUuid(`) && body.includes(`'${field}'`)
      ? ok(`${fn} — ${field}`)
      : ko(`${fn} — le champ « ${field} » part sans contrôle vers Postgres`);
  }
}

// ── 4. Aucun message brut de Postgres à l'écran ─────────────────────────────
console.log('\n  Messages destinés aux humains');
const stub = 'data:text/javascript,' + encodeURIComponent(`
  export const supabase = { from: () => ({}) };
  export const isSupabaseConfigured = false;`);
const apiSrc = api
  .replace("from './supabaseClient'", `from '${stub}'`)
  .replace("from './monitor.js'", "from 'data:text/javascript,export const reportHandledError=()=>{}'")
  .replace("from './time'", "from 'data:text/javascript,export const moPartsOf=()=>({})'");
const { dbErrorMessage } = await import('data:text/javascript;base64,' + Buffer.from(apiSrc).toString('base64'));

const CASES = [
  ['uuid mal formé', { code: '22P02', message: 'invalid input syntax for type uuid: "2"' }],
  ['refus RLS',      { code: '42501', message: 'new row violates row-level security policy' }],
  ['doublon',        { code: '23505', message: 'duplicate key value violates unique constraint' }],
  ['clé étrangère',  { code: '23503', message: 'violates foreign key constraint' }],
  ['réseau',         { message: 'Failed to fetch' }],
  ['inconnu',        { message: 'some opaque backend failure' }],
];
for (const [label, err] of CASES) {
  const out = dbErrorMessage(err);
  if (out === err.message) ko(`${label} — le texte brut de Postgres s'affiche : « ${out} »`);
  else if (!/[éèêàçûîôù’]/.test(out)) ko(`${label} — message non francisé : « ${out} »`);
  else ok(`${label} → « ${out} »`);
}

console.log(failures === 0 ? '\n\x1b[32m✓ Intégrité des données : tout est vert\x1b[0m\n'
                           : `\n\x1b[31m✗ ${failures} échec(s)\x1b[0m\n`);
process.exit(failures === 0 ? 0 : 1);
