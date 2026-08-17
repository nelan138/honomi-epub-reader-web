import EpubBook from "../../../epub/epub-book.js";
import { addBook } from "../../../database/book-repository.js";
import { addCategory } from "../../../database/category-repository.js";
import renderBookshelf from "./render-bookshelf.js";
import type { BookRecord, CategoryRecord } from "../../../database/schema.js";

const defaultCategoryName = "Your Library";

export default function bindBookImportEvents() {
   const importBtn = document.getElementById("import-book-btn")!;
   const fileInput = document.getElementById("epub-file-input")! as HTMLInputElement;

   importBtn.addEventListener("click", () => { fileInput.click() });
   fileInput.addEventListener("change", async () => {
      const files = fileInput.files!;
      for (const file of files) {
         if (!file) continue;

         const categoryRecord: CategoryRecord = {
            name: defaultCategoryName
         }
         await addCategory(categoryRecord);
         const categoryId = await addCategory(categoryRecord);

         const epub = await EpubBook.fromFile(file);
         epub.setCategoryId(categoryId);
         epub.setProgress(0);

         const bookRecord: BookRecord = {
            categoryId: epub.getCategoryId(),
            progress: 0,
            cover: epub.getCover() ?? undefined,
            metadata: epub.getMetadata(),
            epubFile: epub.getEpubFile(),
            opfPath: epub.getOpfPath(),
            manifest: epub.getManifest(),
            navigation: epub.getNavigation(),
            spine: epub.getSpine()
         }

         await addBook(bookRecord);
      }

      await renderBookshelf();
      fileInput.value = "";
   });
}

