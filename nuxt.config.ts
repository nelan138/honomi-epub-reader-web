// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   compatibilityDate: "2025-07-15",
   devtools: { enabled: false },
   ssr: false, // client-side heavy

   css: ["~/assets/css/main.css"],

   imports: {
      dirs: ["~/types", "~/services", "~/defaults"],
   },

   modules: [
      "@nuxt/ui",
      "@nuxt/icon",
      "@nuxt/eslint",
      "@pinia/nuxt",
      "@nuxt/image",
   ],

});
