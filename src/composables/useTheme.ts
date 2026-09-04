import { ref, watch } from 'vue';

type Theme = 'dark' | 'light';

function useTheme() {
   const theme = ref<Theme>(
      (localStorage.getItem('theme') as Theme | null) || 'dark',
   );

   const updateTheme = (value: Theme) => {
      theme.value = value;
   };

   const toggleTheme = () => {
      const nextTheme = theme.value === 'dark' ? 'light' : 'dark';

      if (!document.startViewTransition) {
         updateTheme(nextTheme);
         return;
      }

      // Exact viewport diagonal from top-right to bottom-left
      const endRadius = Math.hypot(
         globalThis.innerWidth,
         globalThis.innerHeight,
      ) * 1.5;

      const transition = document.startViewTransition(() => {
         updateTheme(nextTheme);
         document.documentElement.classList.toggle(
            'dark',
            nextTheme === 'dark',
         );
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

   watch(theme, (newValue) => {
      localStorage.setItem('theme', newValue);
      document.documentElement.classList.toggle('dark', newValue === 'dark');
   }, { immediate: true });

   return { toggleTheme };
}

export default useTheme;
