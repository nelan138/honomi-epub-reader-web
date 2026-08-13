import EpubBook from "../../../epub/epub-book.js";
import { addBook } from "../../../database/book-repository.js";
import { addCategory } from "../../../database/category-repository.js";
import { BookRecord, CategoryRecord } from "../../../database/schema.js";
import renderBookshelf from "./render-bookshelf.js";

export default async function bindBookImportEvents() {
   const importBtn = document.getElementById("import-book-btn");
   const fileInput = document.getElementById("epub-file-input");

   importBtn.addEventListener("click", () => { fileInput.click() });
   fileInput.addEventListener("change", async () => {
      for (const file of fileInput.files) {
         if (!file) continue;

         // ! Newly imported books always go to "Your Books"
         const categoryId = await addCategory(new CategoryRecord("Your Books"));

         const epub = await EpubBook.fromFile(file);
         epub.setCategoryId(categoryId);
         epub.setProgress(0);

         await addBook(new BookRecord(epub));
      }

      await renderBookshelf();
      fileInput.value = "";
   });
}

