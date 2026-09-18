type Theme = 'dark' | 'light';

export function useThemeStore() {
   // STATEs
   const theme = ref<Theme>('dark');

   const isLoading = ref(false);
   const isLoaded = ref(false);

   // ACTIONs
   function reset() {
      theme.value = 'dark';
      isLoading.value = false;
      isLoaded.value = false;
   }

   const updateTheme = (newTheme: Theme) => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);

      theme.value = newTheme;
   };

   function load() {
      if (isLoading.value || isLoaded.value) return;
      isLoading.value = true;

      const storedTheme = localStorage.getItem('theme') as Theme | null;

      if (!storedTheme) localStorage.setItem('theme', theme.value);
      else updateTheme(storedTheme);

      isLoaded.value = true;
      isLoading.value = false;
   }

   const toggleTheme = () => {
      const nextTheme = theme.value === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition) {
         updateTheme(nextTheme);
         return;
      }

      // top-right to bottom-left
      const endRadius = Math.hypot(
         globalThis.innerWidth,
         globalThis.innerHeight,
      ) * 1.5;

      const transition = document.startViewTransition(async () => {
         updateTheme(nextTheme);
         await nextTick();
      });

      transition.ready.then(() => {
         document.documentElement.animate(
            {
               clipPath: [
                  `circle(0px at 100% 0%)`,
                  `circle(${endRadius}px at 100% 0%)`,
               ],
            },
            {
               duration: 800,
               easing: 'ease-in-out',
               pseudoElement: '::view-transition-new(root)',
            },
         );
      });
   };

   return { theme, toggleTheme, load, reset, isLoading, isLoaded };
}
