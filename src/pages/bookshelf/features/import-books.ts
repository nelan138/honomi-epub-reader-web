import EpubBook from '../../../epub/epub-book.ts';

import { defaultCategory } from '../../../database/database.ts';
import { addBook } from '../../../database/book-repository.ts';
import type { BookRecord } from '../../../database/book-repository.ts';
import { getCategoryByName } from '../../../database/category-repository.ts';

import renderBookshelf from './render-bookshelf.ts';

export default function bindBookImportEvents() {
   const importBtn = document.getElementById('import-book-btn')!;
   const fileInput = document.getElementById(
      'epub-file-input',
   )! as HTMLInputElement;

   importBtn.addEventListener('click', () => {
      fileInput.click();
   });
   fileInput.addEventListener('change', async () => {
      const files = fileInput.files!;
      for (const file of files) {
         if (!file) continue;

         const category = await getCategoryByName(defaultCategory.name);

         const epub = await EpubBook.fromFile(file);
         const bookRecord: BookRecord = {
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
