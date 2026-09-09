import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import deno from '@deno/vite-plugin';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
   // server: {
   //    watch: {
   //       usePolling: true,
   //       interval: 15000, // Only scans for file changes every 15 seconds
   //    },
   // },
   plugins: [tailwindcss(), vue(), deno()],
   resolve: {
      tsconfigPaths: true,
      alias: {
         '@src': fileURLToPath(new URL('./src', import.meta.url)),
      },
   },
});
