import { getUserPreferences, setUserPreferences } from "../../../database/user-preference-repository.js";
import openFormFor from "../features/open-forms.js";
import { CategoryRecord, UserPreferencesRecord } from "../../../database/schema.js";
import { addCategory } from "../../../database/category-repository.js";
import renderBookshelf from "../features/render-bookshelf.js";

export default function bindThemeEvents() {
   document.getElementById('find-book-btn').addEventListener('click', async () => {
      const searchText = await openFormFor("search-book");
      if (searchText) {
         await renderBookshelf(searchText);
      }
   });

   document.getElementById('sort-books-btn').addEventListener('click', async () => {
      const userPreferences = await getUserPreferences();
      const newSortOrder = userPreferences.titleSortOrder === "title-asc" ? "title-desc" : "title-asc";
      await setUserPreferences(new UserPreferencesRecord(userPreferences.theme, newSortOrder));
      await renderBookshelf("", newSortOrder);

   });

   document.getElementById('add-category-btn').addEventListener('click', async () => {
      const categoryName = await openFormFor("category-name");
      if (categoryName) {
         const categoryRecord = new CategoryRecord(categoryName);
         await addCategory(categoryRecord);
         await renderBookshelf();
      }
   });

   document.getElementById('toggle-theme-btn').addEventListener('click', async () => {
      const userPreferences = await getUserPreferences();
      const currentTheme = userPreferences.theme;
      if (currentTheme === 'light') {
         await setUserPreferences(new UserPreferencesRecord('dark', userPreferences.titleSortOrder));
         document.documentElement.setAttribute('data-theme', 'dark');
      }
      else {
         await setUserPreferences(new UserPreferencesRecord('light', userPreferences.titleSortOrder));
         document.documentElement.setAttribute('data-theme', 'light');
      }
   });

   document.getElementById('toggle-settings-btn').addEventListener('click', async () => {
      // TODO
   });
}