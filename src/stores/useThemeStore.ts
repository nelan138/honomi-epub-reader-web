type Theme = 'dark' | 'light';

export function useThemeStore() {
   const theme = ref<Theme>('dark');

   // update the document class and localStorage whenever the theme changes
   const updateTheme = (newTheme: Theme) => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);

      theme.value = newTheme;
   };

   let isLoading = false;
   let isLoaded = false;

   function load() {
      if (isLoading || isLoaded) return;
      isLoading = true;

      const storedTheme = localStorage.getItem('theme') as Theme | null;

      if (!storedTheme) localStorage.setItem('theme', theme.value);
      else updateTheme(storedTheme);

      isLoaded = true;
      isLoading = false;
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

   return { theme, toggleTheme, load };
}
