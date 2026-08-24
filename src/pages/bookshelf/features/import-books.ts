import EpubBook from '@src/epub/epub-book.ts';

import { defaultCategory } from '@src/database/database.ts';
import { addBook } from '@src/database/book-repository.ts';
import type { BookRecord } from '@src/database/book-repository.ts';
import { getCategoryByName } from '@src/database/category-repository.ts';

import renderBookshelf from './render-bookshelf.ts';

export default function bindBookImportEvents() {
   const importBtn = document.getElementById('import-book-btn');
   const fileInput = document.getElementById('epub-file-input') as HTMLInputElement;

   if (!importBtn) throw new Error('Import button not found');
   if (!fileInput) throw new Error('File input element not found');

   importBtn.addEventListener('click', () => fileInput.click());
   fileInput.addEventListener('change', async () => {
      const files = fileInput.files!;
      for (const file of files) {
         if (!file) continue;

         const category = await getCategoryByName(defaultCategory.name);

         const epub = await EpubBook.fromFile(file);
         const bookRecord: BookRecord = {
            version: epub.getVersion(),
            categoryId: category.id!,
            progress: 0,
            cover: epub.getCover() ?? undefined,
            metadata: epub.getMetadata(),
            epubFile: epub.getEpubFile(),
            opfPath: epub.getOpfPath(),
            manifest: epub.getManifest(),
            navigation: epub.getNavigation(),
            spine: epub.getSpine(),
         };

         await addBook(bookRecord);
      }
      await renderBookshelf();
      fileInput.value = '';
   });
}
