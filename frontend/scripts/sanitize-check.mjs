// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · le nettoyeur de texte enrichi tient-il ?
//
//   Le champ « interrogatoire / examen / conclusion » du dossier patient est un
//   contenteditable : son contenu est stocké puis réinjecté avec innerHTML dans
//   le navigateur du médecin. Tout le cabinet peut y écrire — le secrétariat
//   compris. sanitizeHtml() est donc une barrière de sécurité, pas un confort
//   d'affichage, et une barrière se met à l'épreuve.
//
//   Ce banc charge la vraie fonction dans un vrai navigateur, lui donne des
//   charges hostiles, puis vérifie deux choses :
//     1. rien ne s'exécute (aucun appel ne parvient au mouchard) ;
//     2. le texte du compte rendu survit (une barrière qui efface le dossier
//        du patient serait un bug, pas une protection).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SRC = new URL('../src/lib/sanitizeHtml.js', import.meta.url).pathname;
// Le fichier n'a aucun import : on peut le charger tel quel dans la page, en
// retirant seulement les mots-clés de module.
const code = readFileSync(SRC, 'utf8').replace(/^export\s+/gm, '');

// ── Charges hostiles ────────────────────────────────────────────────────────
// `must` : ce fragment de texte doit survivre au nettoyage.
const ATTACKS = [
  { n: 'img/onerror',        h: `<img src=x onerror="window.__hit('img')">` },
  { n: 'script inline',      h: `<script>window.__hit('script')<\/script>` },
  { n: 'svg/onload',         h: `<svg onload="window.__hit('svg')"></svg>` },
  { n: 'iframe javascript:', h: `<iframe src="javascript:window.__hit('iframe')"></iframe>` },
  { n: 'body/onload',        h: `<body onload="window.__hit('body')">Tension 13/8</body>`, must: 'Tension 13/8' },
  { n: 'onmouseover',        h: `<div onmouseover="window.__hit('mouse')">Patient fébrile</div>`, must: 'Patient fébrile' },
  { n: 'lien javascript:',   h: `<a href="javascript:window.__hit('a')">Compte rendu</a>`, must: 'Compte rendu' },
  { n: 'style/expression',   h: `<style>@import 'x'</style><p>Douleur thoracique</p>`, must: 'Douleur thoracique' },
  { n: 'form + input',       h: `<form action="//x"><input name="p"></form><p>Suivi</p>`, must: 'Suivi' },
  { n: 'balise incomplète',  h: `<img src=x onerror=window.__hit('half')`, must: '' },
  { n: 'majuscules',         h: `<IMG SRC=x ONERROR="window.__hit('caps')">` },
  { n: 'double encodage',    h: `&lt;img src=x onerror=window.__hit('enc')&gt;`, must: '<img' },
  { n: 'srcdoc',             h: `<iframe srcdoc="<script>window.__hit('srcdoc')<\/script>"></iframe>` },
  { n: 'object/data',        h: `<object data="javascript:window.__hit('obj')"></object>` },
  { n: 'meta refresh',       h: `<meta http-equiv="refresh" content="0;url=//x">Constantes` , must: 'Constantes' },
  { n: 'style sur div',      h: `<div style="background:url(javascript:window.__hit('css'))">Poids 72 kg</div>`, must: 'Poids 72 kg' },
];

// ── Mise en forme légitime : elle doit passer intacte ───────────────────────
const KEEPS = [
  { n: 'gras',      h: `<b>Hypertension</b>`,            expect: '<b>Hypertension</b>' },
  { n: 'italique',  h: `<i>à jeun</i>`,                  expect: '<i>à jeun</i>' },
  { n: 'souligné',  h: `<u>urgent</u>`,                  expect: '<u>urgent</u>' },
  { n: 'barré',     h: `<strike>annulé</strike>`,        expect: '<strike>annulé</strike>' },
  { n: 'liste',     h: `<ul><li>Fièvre</li><li>Toux</li></ul>`, expect: '<ul><li>Fièvre</li><li>Toux</li></ul>' },
  { n: 'taille',    h: `<font size="4">Important</font>`, expect: '<font size="4">Important</font>' },
  { n: 'saut',      h: `Ligne 1<br>Ligne 2`,             expect: 'Ligne 1<br>Ligne 2' },
];

const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel: 'chrome' });
const p = await b.newPage();
await p.goto('about:blank');
await p.evaluate(`window.__hits = []; window.__hit = (k) => window.__hits.push(k); ${code}`);

let fail = 0;

console.log('\n── Charges hostiles ──');
for (const a of ATTACKS) {
  const r = await p.evaluate(([html, must]) => {
    const before = window.__hits.length;
    const host = document.createElement('div');
    document.body.appendChild(host);
    let out = '';
    try { out = sanitizeHtml(html); host.innerHTML = out; } catch (e) { return { err: String(e) }; }
    // Un `onerror` d'image se déclenche de façon asynchrone : on laisse un tour
    // de boucle avant de conclure, sinon le banc se rassure trop vite.
    return new Promise((res) => setTimeout(() => {
      const fired = window.__hits.slice(before);
      const text = host.textContent || '';

      // « Rien ne s'est déclenché » ne suffit pas : innerHTML n'exécute de
      // toute façon ni <script> ni <iframe>, si bien qu'un nettoyeur en panne
      // passerait quand même la moitié des cas. On inspecte donc la SORTIE :
      // aucune balise hors liste, aucun attribut hors `size` sur <font>.
      const KEEP = new Set(['B','STRONG','I','EM','U','S','STRIKE','BR','P','DIV',
        'UL','OL','LI','SPAN','FONT','SUB','SUP']);
      const dirty = [];
      for (const el of host.querySelectorAll('*')) {
        if (!KEEP.has(el.tagName)) { dirty.push(`<${el.tagName.toLowerCase()}>`); continue; }
        for (const at of el.attributes) {
          if (!(el.tagName === 'FONT' && at.name === 'size')) dirty.push(`${el.tagName.toLowerCase()}[${at.name}]`);
        }
      }
      host.remove();
      res({ fired, out, dirty, textOk: !must || text.includes(must) });
    }, 60));
  }, [a.h, a.must ?? '']);

  const ok = !r.err && r.fired.length === 0 && r.dirty.length === 0 && r.textOk;
  if (!ok) fail++;
  const why = r.err ? `exception : ${r.err}`
    : r.fired.length ? `CODE EXÉCUTÉ (${r.fired.join(', ')})`
    : r.dirty.length ? `a survécu au nettoyage : ${[...new Set(r.dirty)].join(', ')}`
    : !r.textOk ? `texte perdu — attendu « ${a.must} », obtenu « ${r.out} »` : '';
  console.log(`  ${ok ? '✓' : '✗'} ${a.n}${why ? '  → ' + why : ''}`);
}

console.log('\n── Mise en forme légitime ──');
for (const k of KEEPS) {
  const out = await p.evaluate((h) => sanitizeHtml(h), k.h);
  const ok = out === k.expect;
  if (!ok) fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${k.n}${ok ? '' : `  → « ${out} » au lieu de « ${k.expect} »`}`);
}

console.log(`\n════ ${fail === 0 ? 'nettoyeur conforme' : `${fail} échec(s)`} ════`);
await b.close();
process.exit(fail === 0 ? 0 : 1);
