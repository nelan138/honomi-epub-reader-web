import EpubBook from "../../../epub/epub-book.js";
import { addBook } from "../../../database/book-repository.js";
import { addCategory } from "../../../database/category-repository.js";
import { BookRecord, CategoryRecord } from "../../../database/schema.js";
import renderBookshelf from "./render-bookshelf.js";

const defaultCategoryName = "Your Books";

export default function bindBookImportEvents() {
   document.getElementById("import-book-btn").addEventListener("click", () => {
      fileInput.click()
   });
   
   document.getElementById("epub-file-input").addEventListener("change", async () => {
      for (const file of fileInput.files) {
         if (!file) continue;

         // ! Newly imported books always go to "Your Books"
         const categoryId = await addCategory(new CategoryRecord(defaultCategoryName));

         const epub = await EpubBook.fromFile(file);
         epub.setCategoryId(categoryId);
         epub.setProgress(0);

         await addBook(new BookRecord(epub));
      }

      await renderBookshelf();
      fileInput.value = "";
   });
}

