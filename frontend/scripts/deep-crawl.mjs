// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · audit d'exhaustivité — clique RÉELLEMENT chaque contrôle de chaque
// écran et note : erreurs console, exceptions, et boutons qui ne font rien.
// Un bouton « sans effet » = aucune modification du DOM, de l'écran, de l'URL
// ni d'ouverture de fenêtre après le clic → soit un contrôle mort, soit un
// retour silencieux qu'il faut expliquer à l'utilisateur.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 4402, BASE = `http://localhost:${PORT}`;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const DOCTOR = ['doctor','dcal','dnav','dappts','dhist','dpatients','ddocs','davail','dnotif','dstats','dabo','dsettings','dchat','dshare','dprescribe','dstaff','dtasks','dpfile','dbill','dplans','dstations','dreq'];
const PUBLIC = ['home','search','profile','pinfo','confirm','plogin','pregister','paccount','about','forpatients','fordoctors','login','docregister','contact','pmessages','confidentialite','forgotpw','verified','checkemail','admin','rxverify'];
const SCREENS = ONLY || [...DOCTOR, ...PUBLIC];

const server = spawn('npx', ['vite','preview','--port',String(PORT),'--strictPort'], { stdio:'ignore', detached:true });
const waitFor = async (u, ms=20000) => { const t=Date.now(); while(Date.now()-t<ms){ try{ const r=await fetch(u); if(r.ok) return; }catch{} await new Promise(r=>setTimeout(r,300)); } throw new Error('no preview'); };
await waitFor(BASE+'/');

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { channel:'chrome' });
const ctx = await browser.newContext({ viewport:{ width:1440, height:900 } });
// Neutralise ce qui bloquerait un navigateur sans interface : impression,
// fenêtres filles, confirmations. Ce ne sont pas des mocks de l'application —
// seulement des garde-fous du banc de test.
await ctx.addInitScript(() => {
  window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  window.open = () => { window.__opened = (window.__opened || 0) + 1;
    return { document: { write() {}, close() {} }, focus() {}, close() {}, print() {}, closed: false }; };
  window.confirm = () => true;
  window.alert = () => {};
});
const page = await ctx.newPage();

const report = { errors: [], noop: [], clicked: 0, screens: {} };
let curErrs = [];
page.on('pageerror', e => curErrs.push('EXC ' + String(e.message).split('\n')[0]));
page.on('console', m => { if (m.type()==='error') { const t=m.text(); if(!/favicon|net::ERR|Failed to load resource|supabase|Refused to|CORS/i.test(t)) curErrs.push('ERR ' + t.slice(0,160)); }});

// ── enter the interactive demo so the doctor side has data ──────────────────
await page.goto(BASE + '/fordoctors', { waitUntil:'domcontentloaded' });
await page.waitForTimeout(1200);
const demo = page.locator('text=/Essayer la démo/i').first();
if (await demo.count()) { await demo.click(); await page.waitForTimeout(2500); }
console.log('demo entered, screen =', await page.evaluate(()=>sessionStorage.getItem('tabibo_screen')));

// Navigation INTERNE (pushState + popstate) : l'app écoute popstate, donc on
// change d'écran sans recharger — le mode démo (état React) survit.
const gotoScreen = async (s) => {
  await page.evaluate((x) => {
    history.pushState({}, '', x === 'home' ? '/' : '/' + x);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, s);
  await page.waitForTimeout(700);
};
const inDemo = () => page.evaluate(() => /Mode démo|démonstration/i.test(document.body.innerText));
const enterDemo = async () => {
  await page.goto(BASE + '/fordoctors', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1400);
  const d = page.locator('text=/Essayer la démo/i').first();
  if (await d.count()) { await d.click(); await page.waitForTimeout(2500); }
};

// snapshot used to decide "did anything happen?"
const snap = () => page.evaluate(() => ({
  scr: sessionStorage.getItem('tabibo_screen'),
  url: location.pathname + location.search,
  len: document.body.innerText.length,
  txt: document.body.innerText.replace(/\s+/g,' ').slice(0, 4000),
  nodes: document.querySelectorAll('*').length,
  fixed: document.querySelectorAll('[style*="position: fixed"],[style*="position:fixed"]').length,
  side: (window.__printed || 0) + (window.__opened || 0),
  // Beaucoup de contrôles ne changent QUE l'apparence (option choisie, onglet
  // actif, ligne surlignée). Sans cette empreinte visuelle, ils passeraient à
  // tort pour des boutons morts.
  look: [...document.querySelectorAll('button,[role="tab"],a,label,input')]
    .slice(0, 400)
    .map((el) => { const s = getComputedStyle(el); return s.backgroundColor + s.borderColor + s.color + s.opacity + (el.getAttribute('aria-selected') || '') + (el.checked ? '1' : ''); })
    .join('|'),
  scroll: Math.round(window.scrollY),
}));

for (const scr of SCREENS) {
  await gotoScreen(scr);
  if (DOCTOR.includes(scr) && !(await inDemo())) { await enterDemo(); await gotoScreen(scr); }
  curErrs = [];
  await page.waitForTimeout(400);
  if (curErrs.length) report.errors.push({ screen: scr, phase:'load', msgs:[...new Set(curErrs)] });

  const n = await page.locator('button:visible').count();
  report.screens[scr] = { buttons: n, noop: 0, errs: 0 };
  console.log(`\n── ${scr} · ${n} boutons`);

  for (let i = 0; i < n; i++) {
    // re-anchor if a previous click navigated away or left a modal open
    const now = await page.evaluate(()=>sessionStorage.getItem('tabibo_screen'));
    if (now !== scr) {
      // un clic nous a déplacés (ou rechargés) : on revient, en restaurant la démo si besoin
      const url = page.url();
      if (!url.startsWith(BASE)) { await enterDemo(); }
      await gotoScreen(scr);
      if (DOCTOR.includes(scr) && !(await inDemo())) { await enterDemo(); await gotoScreen(scr); }
    } else { await page.keyboard.press('Escape').catch(()=>{}); await page.waitForTimeout(120); }

    const btns = page.locator('button:visible');
    if (await btns.count() <= i) break;
    const b = btns.nth(i);
    let label = '';
    try { label = ((await b.innerText()) || (await b.getAttribute('aria-label')) || '').replace(/\s+/g,' ').trim().slice(0,42); } catch { continue; }
    let disabled = false; try { disabled = await b.isDisabled(); } catch {}
    if (disabled) continue;

    if (process.env.VERBOSE) console.log('   →', i, JSON.stringify(label));
    const before = await snap();
    curErrs = [];
    try { await b.click({ timeout: 2500 }); } catch (e) { continue; }
    await page.waitForTimeout(300);
    const after = await snap();
    report.clicked++;

    if (curErrs.length) {
      const msgs = [...new Set(curErrs)];
      report.errors.push({ screen: scr, button: label || `#${i}`, msgs });
      report.screens[scr].errs++;
      console.log(`   ✗ [${label}] ${msgs[0]}`);
    }
    const changed = before.scr!==after.scr || before.url!==after.url || before.txt!==after.txt
      || Math.abs(before.nodes-after.nodes) > 0 || before.fixed!==after.fixed || before.side!==after.side
      || before.look!==after.look || before.scroll!==after.scroll;
    if (!changed) {
      report.noop.push({ screen: scr, button: label || `#${i}`, index: i });
      report.screens[scr].noop++;
      console.log(`   ○ sans effet : "${label}"`);
    }
  }
}

writeFileSync('/tmp/claude-0/-home-claude/b895a1eb-b8e4-55f2-a49f-539014f6f943/scratchpad/audit/crawl2.json', JSON.stringify(report,null,2));
console.log(`\n════ ${report.clicked} clics · ${report.errors.length} erreurs · ${report.noop.length} sans effet ════`);
for (const e of report.errors) console.log(`ERR  ${e.screen} [${e.button||e.phase}] ${e.msgs[0]}`);
await browser.close();
try { process.kill(-server.pid); } catch {}
process.exit(0);
