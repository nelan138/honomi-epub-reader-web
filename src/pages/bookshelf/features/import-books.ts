import { EpubBook } from '@src/epub/epub-book.ts';

import { defaultCategory } from '@src/database/database.defaults.ts';
import { addBook } from '@src/database/books/book-repository.ts';
import { getCategoryByName } from '@src/database/categories/category-repository.ts';

import renderBookshelf from './render-bookshelf.ts';
import type { BookRecord } from '@src/database/books/book.types.ts';

export default function bindBookImportEvents() {
   const importBtn = document.getElementById('import-book-btn');
   const fileInput = document.getElementById('epub-file-input') as HTMLInputElement;

   if (!importBtn) throw new Error('Import button not found');
   if (!fileInput) throw new Error('File input element not found');

   importBtn.addEventListener('click', () => fileInput.click());
   fileInput.addEventListener('change', async () => {
      const files = fileInput.files;
      if (!files || files.length === 0) return;

      const categoryId = (await getCategoryByName(defaultCategory.name)).id;

      for (const file of files) {
         if (!file) continue;

         const epub = new EpubBook(file);
         await epub.parse();

         const record: Omit<BookRecord, 'id'> = {
            categoryId: categoryId,

            progress: 0,
            version: epub.getVersion(),

            metadata: epub.getMetadata(),
            cover: epub.getCover(),

            epubFile: epub.getEpubFile(),
            opfPath: epub.getOpfPath(),
            manifest: epub.getManifest(),
            navigation: epub.getNavigation(),

            spine: epub.getSpine(),
         };

         await addBook(record);
      }

      fileInput.value = '';
      await renderBookshelf();
   });
}
