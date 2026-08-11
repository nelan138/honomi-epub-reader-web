import EpubBook from "../../../epub/epub-book.js";
import { addBook, addCategory } from "../../../database/database.js";
import { BookRecord, CategoryRecord } from "../../../database/schema.js";
import renderBookshelf from "./render-bookshelf.js";

const importBtn = document.getElementById("import-book-btn");
const fileInput = document.getElementById("epub-file-input");

importBtn.addEventListener("click", () => { fileInput.click() });
fileInput.addEventListener("change", async () => {
   const file = fileInput.files[0];
   if (!file) return;

   console.log("Importing book:", file.name);
   // ! Newly imported books always go to "Your Library"
   const categoryId = await addCategory(new CategoryRecord("Your Library"));

   const epub = await EpubBook.fromFile(file);
   epub.setCategoryId(categoryId);
   epub.setProgress(0);
   console.log(`Successfully parsed: ${file.name}: `, epub);

   const bookRecord = new BookRecord(epub);

   await addBook(bookRecord);
   await renderBookshelf();

   fileInput.value = "";
});
