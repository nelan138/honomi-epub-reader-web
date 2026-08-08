import EpubBook from "../../../epub/epub-book.js";
import { addBook, addCategory } from "../../../database/database.js";
import renderBookshelf from "./render-bookshelf.js";

const importBtn = document.getElementById("import-book-btn");
const fileInput = document.getElementById("epub-file-input");

importBtn.addEventListener("click", () => { fileInput.click() });
fileInput.addEventListener("change", async () => {
   const file = fileInput.files[0];
   if (!file) return;

   const epub = new EpubBook(file);
   await epub.parse();

   // Newly imported books always go to "Your Library"
   const categoryId = await addCategory("Your Library");
   const metadata = epub.getMetadata();
   const book = {
      title: metadata.title,
      categoryId: categoryId,
      file: epub.getEpubFile(),
      progress: 0,
   };

   await addBook(book);
   await renderBookshelf();
   fileInput.value = "";
});
