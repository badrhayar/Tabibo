#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Tabibo · fabrique l'archive du projet (source uniquement)
#
#   Écrit ce script parce qu'un motif d'exclusion posé à la main a déjà laissé
#   passer `frontend/.env` : le motif « .env » ne vise que la racine, il faut
#   « */.env » pour les sous-dossiers. Les valeurs concernées étaient publiques
#   (clé anonyme Supabase, clé de site Turnstile), mais le contrôle qui devait
#   l'attraper avait annoncé « rien de sensible ». C'est le contrôle qui était
#   faux, pas seulement l'archive.
#
#   Ce script exclut, puis VÉRIFIE, puis échoue s'il reste quoi que ce soit.
#
#   Usage :  ./scripts/package.sh [chemin/de/sortie.zip]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$HOME/tabibo-FULL-project.zip}"

cd "$ROOT"
rm -f "$OUT"

zip -r -q "$OUT" . \
  -x '*/node_modules/*' 'node_modules/*' \
     '*/dist/*' 'dist/*' \
     '*.zip' \
     '*/.git/*' '.git/*' \
     '*/.supabase/*' '.supabase/*' \
     '*/backups/*' 'backups/*' \
     'twa/app/*' 'twa/.gradle/*' \
     '*.keystore' '*.jks' '*.aab' '*.apk' \
     '.env' '.env.*' '*/.env' '*/.env.*'

# Le listing est capturé UNE fois : `unzip -l | grep -q` sous `pipefail` échoue
# à cause du SIGPIPE que grep envoie en sortant tôt — un faux négatif silencieux.
LISTING=$(unzip -l "$OUT")

# ── Contrôle : rien de tout cela ne doit figurer dans l'archive ─────────────
LEAKS=$(echo "$LISTING" | grep -E 'node_modules/|/dist/|\.env($|\.)|\.keystore|\.jks|\.aab|\.apk|\.git/' || true)
if [ -n "$LEAKS" ]; then
  echo "✗ L'archive contient des entrées interdites :"
  echo "$LEAKS"
  rm -f "$OUT"
  exit 1
fi

# ── Contrôle : ce qui DOIT y être ──────────────────────────────────────────
for needed in \
  'supabase/migrations/' \
  'frontend/src/' \
  'frontend/public/sw.js' \
  'DEPLOY.md'
do
  if ! echo "$LISTING" | grep -q "$needed"; then
    echo "✗ Entrée manquante dans l'archive : $needed"
    rm -f "$OUT"
    exit 1
  fi
done

SW=$(unzip -p "$OUT" frontend/public/sw.js | grep -m1 'CACHE_VERSION =' || true)
echo "✓ $(basename "$OUT") — $(echo "$LISTING" | tail -1 | awk '{print $2}') fichiers, $(du -h "$OUT" | cut -f1)"
echo "  $SW"
