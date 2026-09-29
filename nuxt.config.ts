// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   compatibilityDate: "2025-07-15",
   devtools: { enabled: false },
   ssr: false, // client-side heavy

   css: ["~/assets/css/main.css"],

   imports: {
      dirs: ["~/types", "~/defaults"],
   },

   modules: [
      "@nuxt/ui",
      "@nuxt/icon",
      "@nuxt/image",
      "@nuxt/eslint",
      "@pinia/nuxt",
   ],
});
