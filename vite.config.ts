import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
   plugins: [
      tailwindcss(),
      vue(),
      AutoImport({
         imports: [
            'vue',
            'vue-router',
            '@vueuse/core',
         ],
         dts: 'src/auto-imports.d.ts',
         vueTemplate: true,
      }),
      Components({
         dirs: ['src/components'],
         dts: 'src/components.d.ts',
      }),
   ],
   resolve: {
      alias: {
         '@src': fileURLToPath(new URL('./src', import.meta.url)),
      },
   },
});
