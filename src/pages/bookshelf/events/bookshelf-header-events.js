import { getTheme, setTheme } from "../../../database/theme-repository.js";

export default async function bindThemeEvents() {
   const currentTheme = await getTheme()
   document.documentElement.setAttribute('data-theme', currentTheme);

   const toggle = document.getElementById('toggle-theme-btn');
   toggle.addEventListener(('click'), async () => {
      if (await getTheme() === 'light') {
         await setTheme('dark');
         document.documentElement.setAttribute('data-theme', 'dark');
      }
      else {
         await setTheme('light');
         document.documentElement.setAttribute('data-theme', 'light');
      }
   })
}