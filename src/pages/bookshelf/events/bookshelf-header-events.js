import { getTheme, setTheme } from "../../../database/theme-repository.js";
import openFormFor from "../features/open-forms.js";
import { CategoryRecord } from "../../../database/schema.js";
import { addCategory } from "../../../database/category-repository.js";
import renderBookshelf from "../features/render-bookshelf.js";

export default function bindThemeEvents() {
   const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

   document.getElementById('toggle-theme-btn').addEventListener('click', async () => {
      if (await getTheme() === 'light') {
         await setTheme('dark');
         document.documentElement.setAttribute('data-theme', 'dark');
      }
      else {
         await setTheme('light');
         document.documentElement.setAttribute('data-theme', 'light');
      }
   });

   document.getElementById('add-category-btn').addEventListener('click', async () => {
      const categoryName = await openFormFor("category-name");
      if (categoryName) {
         const categoryRecord = new CategoryRecord(categoryName);
         await addCategory(categoryRecord);
         await renderBookshelf();
      }
   });
}