// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · le client et la base parlent-ils encore la même langue ?
//
//   L'invitation d'une secrétaire est restée cassée pendant des semaines pour
//   une raison bête : le client appelait `user_id_for_email`, révoquée lors d'un
//   durcissement. Rien ne l'a signalé — ni la compilation, ni le linter, ni les
//   bancs d'essai, parce que l'erreur n'apparaît qu'au moment du clic, chez le
//   médecin, en production.
//
//   Ce banc relit les migrations, en déduit ce que la base offre vraiment, puis
//   compare avec ce que le client appelle :
//     · chaque `supabase.rpc('x')`         → la fonction existe et est exécutable
//     · chaque `supabase.from('t')`        → la table ou la vue existe
//     · chaque `supabase.storage.from('b')`→ le casier existe
//
//   Il ne remplace pas un test d'intégration : il attrape la classe d'erreur la
//   plus coûteuse — celle qu'on ne voit qu'en production.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIG = new URL('../../supabase/migrations/', import.meta.url).pathname;
const SRC = new URL('../src/', import.meta.url).pathname;

const files = readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();
const sql = files.map((f) => readFileSync(join(MIG, f), 'utf8')).join('\n');

const all = (re, s = sql) => [...s.matchAll(re)].map((m) => m[1]);

const funcs = new Set([...all(/create (?:or replace )?function public\.(\w+)\s*\(/g)]);

// Les droits se lisent DANS L'ORDRE des migrations : c'est exactement ce qui
// avait échappé la première fois. `user_id_for_email` était bien définie et
// bien accordée — puis une migration ultérieure l'a révoquée, et le client a
// continué de l'appeler. Un simple « existe-t-il un grant quelque part ? »
// répond oui et ne voit rien. On rejoue donc la séquence.
const granted = new Set();
for (const f of files) {
  const s = readFileSync(join(MIG, f), 'utf8');
  // Chaque instruction dans son ordre d'apparition, grant et revoke mêlés.
  for (const m of s.matchAll(/(grant|revoke)\s+(?:all|execute)[^;]*?on function public\.(\w+)\s*\([^)]*\)\s*(?:to|from)\s+([^;]+);/gis)) {
    const [, verb, name, roles] = m;
    const touchesClient = /\b(authenticated|anon|public)\b/i.test(roles);
    if (!touchesClient) continue;
    if (verb.toLowerCase() === 'grant') {
      if (/\bauthenticated\b/i.test(roles) || /\banon\b/i.test(roles)) granted.add(name);
    } else {
      // revoke … from public/anon seul ne retire rien à `authenticated`.
      if (/\bauthenticated\b/i.test(roles) || /\bpublic\b/i.test(roles)) granted.delete(name);
    }
  }
}
const tables  = new Set([...all(/create table (?:if not exists )?public\.(\w+)/g)]);
const views   = new Set([...all(/create (?:or replace )?view public\.(\w+)/g)]);
const buckets = new Set([...sql.matchAll(/insert into storage\.buckets[^;]*?values\s*([^;]+);/gs)]
  .flatMap((m) => [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1])));

// Le client — tous les .js/.jsx de src/
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name))
    : /\.jsx?$/.test(e.name) ? [join(dir, e.name)] : []);

const calls = { rpc: new Map(), rel: new Map(), bucket: new Map() };
const note = (map, name, file) => {
  if (!map.has(name)) map.set(name, new Set());
  map.get(name).add(file.replace(SRC, 'src/'));
};

for (const f of walk(SRC)) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\.rpc\(\s*['"](\w+)['"]/g)) note(calls.rpc, m[1], f);
  for (const m of s.matchAll(/storage\s*\.\s*from\(\s*['"]([\w-]+)['"]/g)) note(calls.bucket, m[1], f);
  // `.from()` qui n'est PAS précédé de `storage` : une table ou une vue.
  for (const m of s.matchAll(/(storage\s*\.\s*)?\bfrom\(\s*['"]([\w-]+)['"]/g)) {
    if (!m[1]) note(calls.rel, m[2], f);
  }
}
// Un nom vu comme casier n'est pas une relation.
for (const b of calls.bucket.keys()) calls.rel.delete(b);

let fail = 0;
const check = (title, map, has, kind) => {
  console.log(`\n── ${title} ──`);
  let bad = 0;
  for (const [name, files] of [...map].sort()) {
    if (has(name)) continue;
    bad++; fail++;
    console.log(`  ✗ ${name} — aucun ${kind} de ce nom dans les migrations`);
    for (const f of files) console.log(`      appelé depuis ${f}`);
  }
  console.log(`  ${map.size} ${title.toLowerCase()}, ${bad} sans correspondance`);
};

check('Fonctions (rpc)', calls.rpc, (n) => funcs.has(n), 'fonction');
check('Tables et vues', calls.rel, (n) => tables.has(n) || views.has(n), 'table ni vue');
check('Casiers de fichiers', calls.bucket, (n) => buckets.has(n), 'casier');

// Une fonction définie mais jamais accordée n'est appelable par personne.
console.log('\n── Droits d\'exécution ──');
let ungranted = 0;
for (const [name] of [...calls.rpc].sort()) {
  if (funcs.has(name) && !granted.has(name)) {
    ungranted++; fail++;
    console.log(`  ✗ ${name} — définie, mais aucun « grant execute » : le client sera refusé`);
  }
}
console.log(`  ${ungranted} fonction(s) sans droit d'exécution`);

console.log(`\n════ ${fail === 0 ? 'le client et la base concordent' : `${fail} désaccord(s)`} ════`);
process.exit(fail === 0 ? 0 : 1);
