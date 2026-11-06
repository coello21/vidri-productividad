import { defineConfig } from 'vite';

/**
 * Plantilla del HTML que se descarga: la misma página en modo "copia" (sin inicio de sesión ni base de datos).
 * scripts/plantilla.mjs la junta en un solo archivo: dist/plantilla.html
 */
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist-copia',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
