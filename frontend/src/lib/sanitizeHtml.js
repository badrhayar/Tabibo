// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · nettoyage du texte enrichi
//
//  POURQUOI. L'éditeur du dossier patient (interrogatoire, examen clinique,
//  conclusion) est un `contenteditable` : il produit du HTML, il le stocke, et
//  il le réinjecte plus tard avec `innerHTML`. Or ce champ n'est pas écrit par
//  une seule personne. Une secrétaire, un remplaçant — toute personne à qui le
//  cabinet a ouvert le dossier — peut y écrire, soit en collant du contenu
//  d'une page web, soit en appelant l'API directement.
//
//  L'ATTAQUE. Il suffit d'enregistrer `<img src=x onerror="…">` dans la
//  conclusion. `innerHTML` déclenche l'attribut au moment même de l'affichage :
//  le code s'exécute dans le NAVIGATEUR DU MÉDECIN, avec sa session. Celui qui
//  n'avait que le secrétariat signe alors des ordonnances.
//
//  LA RÈGLE. Un compte rendu n'a besoin que de mise en forme : gras, italique,
//  souligné, barré, listes, taille. Tout le reste est retiré. On garde le
//  texte, jamais la balise. Aucun attribut ne survit, sauf `size` sur `<font>`
//  (ce que produit la commande « Grand / Normal / Petit ») et seulement s'il
//  vaut un chiffre.
//
//  Le nettoyage s'applique DANS LES DEUX SENS : à la lecture (ce qui est déjà
//  en base peut être sale) et à l'écriture (rien de sale n'y entre).
// ─────────────────────────────────────────────────────────────────────────────

// Balises de mise en forme conservées telles quelles.
const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV',
  'UL', 'OL', 'LI', 'SPAN', 'FONT', 'SUB', 'SUP']);

// Balises dont on jette aussi le contenu : il n'y a rien à sauver dedans.
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META',
  'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'NOSCRIPT', 'TEMPLATE',
  'SVG', 'MATH', 'AUDIO', 'VIDEO', 'SOURCE', 'CANVAS', 'IMG']);

/**
 * Rend un fragment HTML sûr pour `innerHTML`.
 * Les balises inconnues sont « déballées » : on perd la balise, on garde le
 * texte — un compte rendu ne doit jamais disparaître parce qu'il a été collé
 * depuis Word.
 */
export function sanitizeHtml(html) {
  const src = String(html ?? '');
  if (!src) return '';
  if (typeof document === 'undefined') return src.replace(/<[^>]*>/g, '');

  // DOMParser construit un document inerte : rien ne s'exécute, aucune image
  // n'est chargée, aucun `onerror` ne se déclenche pendant l'analyse.
  const doc = new DOMParser().parseFromString(`<body>${src}</body>`, 'text/html');
  const out = document.createElement('div');

  const copy = (from, to) => {
    for (const node of Array.from(from.childNodes)) {
      if (node.nodeType === 3) {                       // texte
        to.appendChild(document.createTextNode(node.nodeValue));
        continue;
      }
      if (node.nodeType !== 1) continue;               // commentaire, etc.
      const tag = node.tagName.toUpperCase();
      if (DROP.has(tag)) continue;                     // contenu jeté avec la balise
      if (!KEEP.has(tag)) { copy(node, to); continue; } // déballée : on garde le texte

      const el = document.createElement(tag.toLowerCase());
      if (tag === 'FONT') {
        const size = node.getAttribute('size');
        if (size && /^[1-7]$/.test(size.trim())) el.setAttribute('size', size.trim());
      }
      // Aucun autre attribut n'est recopié : ni `on*`, ni `style`, ni `href`.
      copy(node, el);
      to.appendChild(el);
    }
  };

  copy(doc.body, out);
  return out.innerHTML;
}

/** Le même contenu, réduit à son texte — pour les impressions et les résumés. */
export const htmlToText = (html) =>
  String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
