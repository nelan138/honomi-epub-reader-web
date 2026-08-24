import { EpubBook } from '@src/epub/epub-book.ts';

import { defaultCategory } from '@src/database/database.ts';
import { addBook } from '@src/database/book-repository.ts';
import { getCategoryByName } from '@src/database/category-repository.ts';

import renderBookshelf from './render-bookshelf.ts';

export default function bindBookImportEvents() {
   const importBtn = document.getElementById('import-book-btn');
   const fileInput = document.getElementById('epub-file-input') as HTMLInputElement;

   if (!importBtn) throw new Error('Import button not found');
   if (!fileInput) throw new Error('File input element not found');

   importBtn.addEventListener('click', () => fileInput.click());
   fileInput.addEventListener('change', async () => {
      const files = fileInput.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
         if (!file) continue;

         const categoryId = (await getCategoryByName(defaultCategory.name)).id;
         if (categoryId === undefined) throw new Error('Default category not found');

         const epub = new EpubBook(file);
         await epub.parse();

         await addBook({
            id: null,
            categoryId: categoryId,
            progress: 0,
            version: epub.getVersion(),

            epubFile: epub.getEpubFile(),
            opfPath: epub.getOpfPath(),
            manifest: epub.getManifest(),
            navigation: epub.getNavigation(),

            spine: epub.getSpine(),
            cover: epub.getCover(),
            metadata: epub.getMetadata(),
         });
      }
      
      fileInput.value = '';
      await renderBookshelf();
   });
}
