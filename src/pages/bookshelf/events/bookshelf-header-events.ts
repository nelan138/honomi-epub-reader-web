import { getUserPreferences, setUserPreferences } from "../../../database/user-preference-repository.js";
import openFormFor from "../features/open-forms.js";
import { addCategory } from "../../../database/category-repository.js";
import renderBookshelf from "../features/render-bookshelf.js";
import type { CategoryRecord } from "../../../database/schema.js";

export default function bindBookshelfHeaderEvents() {
   document.getElementById('open-github-repo-btn')!.addEventListener('click', () => {
      window.open('https://github.com/nelan138/honomi-epub-reader-web', '_blank');
   });

   document.getElementById('find-book-btn')!.addEventListener('click', async () => {
      const searchText = await openFormFor("search-book") as string;
      if (searchText) {
         await renderBookshelf(searchText);
      }
   });

   document.getElementById('sort-books-btn')!.addEventListener('click', async () => {
      let userPreferences = await getUserPreferences();
      const newSortOrder = userPreferences.titleSortOrder === "title-asc" ? "title-desc" : "title-asc";
      userPreferences = {
         theme: userPreferences.theme,
         titleSortOrder: newSortOrder
      }
      await setUserPreferences(userPreferences);
      await renderBookshelf();
   });

   document.getElementById('add-category-btn')!.addEventListener('click', async () => {
      const categoryName = await openFormFor("category-name") as string;
      if (categoryName) {
         const record: CategoryRecord = {
            name: categoryName,
            expanded: true,
         }
         await addCategory(record);
         await renderBookshelf();
      }
   });

   document.getElementById('toggle-theme-btn')!.addEventListener('click', async () => {
      let userPreferences = await getUserPreferences();
      const currentTheme = userPreferences.theme;
      if (currentTheme === 'light') {
         userPreferences.theme = 'dark';
         await setUserPreferences(userPreferences);
         document.documentElement.setAttribute('data-theme', 'dark');
      }
      else {
         userPreferences.theme = 'light';
         await setUserPreferences(userPreferences);
         document.documentElement.setAttribute('data-theme', 'light');
      }
   });

   document.getElementById('toggle-settings-btn')!.addEventListener('click', async () => {
      // TODO
   });
}