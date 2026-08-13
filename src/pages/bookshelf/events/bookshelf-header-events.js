import { getTheme, setTheme } from "../../../database/theme-repository.js";

export default function bindThemeEvents() {
   const toggle = document.getElementById('toggle-theme-btn');
   toggle.addEventListener(('click'), async () => {
      const currentTheme = await getTheme();
      console.log(`Current theme: ${currentTheme}`);
      if (currentTheme === 'light') {
         document.documentElement.setAttribute('data-theme', 'dark');
         await setTheme('dark');
      }

      else if (currentTheme === 'dark') {
         document.documentElement.setAttribute('data-theme', 'light');
         await setTheme('light');
      }
   })
}