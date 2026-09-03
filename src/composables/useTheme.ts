import { ref, watch } from 'vue';

type Theme = 'dark' | 'light';

function useTheme() {
   const theme = ref<Theme>((localStorage.getItem('theme') as Theme | null) || 'dark');

   const toggleTheme = () => theme.value = theme.value === 'dark' ? 'light' : 'dark';
   const updateTheme = (value: Theme) => theme.value = value;

   watch(theme, (newValue) => {
      localStorage.setItem('theme', newValue);
      document.documentElement.classList.toggle('dark', newValue === 'dark');
   }, { immediate: true });

   return { toggleTheme, updateTheme };
}

export default useTheme;
