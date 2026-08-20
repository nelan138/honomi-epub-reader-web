import {
   getUserPreferences,
   setUserPreferences,
} from '../../../database/user-preference-repository.ts';
import { addCategory } from '../../../database/category-repository.ts';
import type { TitleSortOrder } from '../../../database/user-preference-repository.ts';
import type { CategoryRecord } from '../../../database/category-repository.ts';

import renderBookshelf from '../features/render-bookshelf.ts';
import openFormFor from '../features/open-forms.ts';

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
         if (searchText) {
            await renderBookshelf(searchText);
         }
      },
   );

   document.getElementById('sort-books-btn')!.addEventListener(
      'click',
      async () => {
         let userPreferences = await getUserPreferences();
         const newSortOrder: TitleSortOrder =
            userPreferences.titleSortOrder === 'title-asc'
               ? 'title-desc'
               : 'title-asc';
         userPreferences = {
            theme: userPreferences.theme,
            titleSortOrder: newSortOrder,
         };
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
         userPreferences.theme = userPreferences.theme === 'light'
            ? 'dark'
            : 'light';

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
         // TODO(@me)
      },
   );
}
