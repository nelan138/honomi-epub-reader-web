import { getUserPreferences, setUserPreferences } from '../../../database/user-setting-repository.ts';
import { addCategory } from '@src/database/category-repository.ts';
import type { CategoryRecord } from '@src/database/category-repository.ts';

import renderBookshelf from '../features/render-bookshelf.ts';
import { openFormFor } from '../features/overlays.ts';

export default function bindBookshelfHeaderEvents() {
   document.getElementById('open-github-repo-btn')!.addEventListener(
      'click',
      () => {
         globalThis.open(
            'https://github.com/nelan138/honomi-epub-reader-web',
            '_blank',
         );
      },
   );

   document.getElementById('find-book-btn')!.addEventListener(
      'click',
      async () => {
         const searchText = await openFormFor('search-book') as string;
         if (searchText) await renderBookshelf(searchText);
      },
   );

   document.getElementById('sort-books-btn')!.addEventListener(
      'click',
      async () => {
         const userPreferences = await getUserPreferences();
         userPreferences.titleSortOrder = userPreferences.titleSortOrder === 'title-asc' ? 'title-desc' : 'title-asc';

         await setUserPreferences(userPreferences);
         await renderBookshelf();
      },
   );

   document.getElementById('add-category-btn')!.addEventListener(
      'click',
      async () => {
         const categoryName = await openFormFor('category-name') as string;
         if (categoryName) {
            const record: CategoryRecord = {
               name: categoryName,
               expanded: true,
            };
            await addCategory(record);
            await renderBookshelf();
         }
      },
   );

   document.getElementById('toggle-theme-btn')!.addEventListener(
      'click',
      async () => {
         const userPreferences = await getUserPreferences();
         userPreferences.theme = userPreferences.theme === 'light' ? 'dark' : 'light';

         await setUserPreferences(userPreferences);
         document.documentElement.setAttribute(
            'data-theme',
            userPreferences.theme,
         );
      },
   );

   document.getElementById('toggle-settings-btn')!.addEventListener(
      'click',
      async () => {
      },
   );
}
