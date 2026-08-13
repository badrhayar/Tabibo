import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// La version de build vient du service worker — une seule source de vérité.
// Elle est injectée dans le bundle pour que chaque erreur remontée dise de
// QUELLE version elle provient : le jour du lancement on publie des correctifs
// à l'heure, et sans cette étiquette on ne sait pas si une erreur vient de la
// build corrigée ou d'une coquille encore servie depuis le cache.
function appVersion() {
  try {
    const sw = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8')
    return sw.match(/CACHE_VERSION\s*=\s*["']([^"']+)["']/)?.[1] || 'inconnue'
  } catch {
    return 'inconnue'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
