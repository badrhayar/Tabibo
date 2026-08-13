// Surveillance d'erreurs auto-hébergée — les erreurs partent dans la table
// `client_errors` et remontent dans la console d'administration.
//
// Trois principes, dans cet ordre :
//   1. la surveillance ne doit JAMAIS casser l'application (tout est en try) ;
//   2. elle ne doit JAMAIS transporter de donnée personnelle (voir `scrub`) ;
//   3. elle doit rester bornée (déduplication + plafonds par session).
//
// Deux familles de rapports :
//   • non rattrapés — window.onerror, unhandledrejection, ErrorBoundary ;
//   • rattrapés     — `reportHandledError('createAppointment', err)` posé sur
//     les écritures critiques. C'est la famille qui compte le jour de
//     l'ouverture : une réservation refusée est rattrapée par la page, le
//     patient voit « une erreur est survenue » et repart. Sans ce rapport,
//     la console reste vide pendant que les rendez-vous se perdent.
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Version de build, injectée par vite.config.js depuis le service worker —
// une seule source de vérité pour « quelle version tourne chez cet utilisateur ».
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null;

// Plafonds distincts : un plantage de rendu se répète en boucle, une écriture
// refusée non. On tolère donc davantage de rapports rattrapés.
const CAP = { uncaught: 10, rejection: 10, boundary: 10, handled: 25 };

const seen = new Set();
const sentByKind = { uncaught: 0, rejection: 0, boundary: 0, handled: 0 };

let userRole = 'anon';

/** Appelé quand la session change — le rôle sert au tri, jamais à identifier. */
export function setMonitorRole(role) {
  userRole = ['patient', 'doctor', 'staff', 'admin'].includes(role) ? role : 'anon';
}

// ── Épuration ────────────────────────────────────────────────────────────────
// Un message d'erreur Postgres peut recopier la valeur fautive :
//   « duplicate key value violates unique constraint … Key (email)=(a@b.ma) »
// Une erreur applicative peut contenir un nom de patient. Rien de tout cela
// n'a sa place dans une table d'exploitation, a fortiori sur une plateforme de
// santé dont la politique de confidentialité ne déclare aucun sous-traitant de
// supervision. On remplace en place plutôt que de rejeter le rapport : mieux
// vaut une erreur épurée qu'une erreur perdue.
const RULES = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '‹courriel›'],
  [/(?:\+212|00212|0)\s?[5-7](?:[\s.-]?\d){8}/g, '‹téléphone›'],
  [/\beyJ[\w-]{6,}\.[\w-]+\.[\w-]+/g, '‹jeton›'],          // JWT
  // CIN marocain : une ou deux lettres suivies de chiffres (AB123456). La
  // frontière de mot ne se déclenche pas entre une lettre et un chiffre, donc
  // la règle numérique seule laissait passer le numéro entier — trouvé par le
  // banc, pas par relecture.
  [/\b[A-Za-z]{1,2}\d{5,}\b/g, '‹identifiant›'],
  [/\b\d[\d\s]{6,}\d\b/g, '‹chiffres›'],                    // INPE, RIB, n° de carte
];

function scrub(text) {
  let out = String(text);
  for (const [re, mask] of RULES) out = out.replace(re, mask);
  return out;
}

// ── Envoi ────────────────────────────────────────────────────────────────────
function send(kind, message, stack, context) {
  try {
    if (!isSupabaseConfigured || !message) return;
    if (sentByKind[kind] >= CAP[kind]) return;

    const msg = scrub(message).slice(0, 500);
    // Déduplication sur le triplet : deux échecs identiques sur la même
    // opération n'apportent rien de plus, deux opérations différentes si.
    const key = kind + '|' + (context || '') + '|' + msg;
    if (seen.has(key)) return;
    seen.add(key);
    sentByKind[kind] += 1;

    supabase.from('client_errors').insert({
      kind,
      context: context ? String(context).slice(0, 80) : null,
      message: msg,
      stack: stack ? scrub(stack).slice(0, 2000) : null,
      // Origine + chemin seulement — la chaîne de requête peut porter des
      // données personnelles (le flux d'invitation passe /pregister?email=…).
      url: String(location.origin + location.pathname).slice(0, 300),
      ua: String(navigator.userAgent).slice(0, 300),
      app_screen: (() => { try { return sessionStorage.getItem('tabibo_screen') || null; } catch { return null; } })(),
      app_version: APP_VERSION,
      user_role: userRole,
    }).then(() => {});
  } catch (_) { /* la surveillance ne doit jamais casser l'application */ }
}

/** Erreur non rattrapée (onerror, ErrorBoundary). */
export function reportClientError(message, stack, kind = 'uncaught') {
  send(kind, message, stack, null);
}

/**
 * Erreur rattrapée par un `catch` applicatif.
 * `context` doit être une chaîne LITTÉRALE écrite dans le code — le nom de
 * l'opération, jamais une donnée d'utilisateur.
 */
export function reportHandledError(context, err) {
  try {
    // Une coupure réseau n'est pas un défaut de l'application : la signaler
    // noierait la console au premier tunnel sur l'autoroute Casa–Rabat.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const message = err?.message || err?.error_description || String(err || 'erreur');
    // Code Postgres / HTTP en tête : c'est ce qui distingue une RLS qui refuse
    // (42501) d'une contrainte violée (23505) au premier coup d'œil.
    const code = err?.code || err?.status;
    send('handled', code ? `[${code}] ${message}` : message, err?.stack, context);
  } catch (_) { /* ignore */ }
}

export function installErrorMonitor() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    // Les erreurs de ressource (script/lien qui ne charge pas) n'ont pas de
    // message exploitable et sont déjà traitées par l'auto-réparation de
    // main.jsx — on ne les double pas ici.
    if (e?.target && e.target !== window && e.target.tagName) return;
    reportClientError(e?.message || 'window.onerror', e?.error?.stack, 'uncaught');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e?.reason;
    reportClientError(r?.message || String(r || 'unhandledrejection'), r?.stack, 'rejection');
  });
}
