// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   compatibilityDate: "2025-07-15",
   devtools: { enabled: false },

   imports: {
      dirs: ["~/services", "~/services/**", "~/types", "~/types/**"],
   },

   modules: [
      "@nuxt/ui",
      "@nuxt/icon",
      "@nuxt/eslint",
      "@pinia/nuxt",
      "@nuxt/image",
   ],

   css: ["~/assets/css/main.css"],
});
