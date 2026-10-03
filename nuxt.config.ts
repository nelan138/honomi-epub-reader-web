// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   app: {
      head: {
         link: [
            { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
            { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
            { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
            { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
            { rel: 'manifest', href: '/site.webmanifest' },
         ],
      },
   },

   compatibilityDate: '2025-07-15',
   devtools: { enabled: false },

   ssr: false, // client-side heavy

   css: ['~/assets/css/main.css'],

   imports: {
      dirs: ['~/types', '~/defaults'],
   },

   modules: ['@nuxt/ui', '@nuxt/icon', '@nuxt/image', '@nuxt/eslint', '@pinia/nuxt', '@vueuse/nuxt'],
});
