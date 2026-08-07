import { EpubBook } from "../../../epub/epub-book.js";
import { addBook } from "../../../database/db.js";
import renderBookshelf from "./render-bookshelf.js"

const importBtn = document.getElementById("import-book-btn");
const fileInput = document.getElementById("epub-file-input");

importBtn.addEventListener("click", () => { fileInput.click() });
fileInput.addEventListener("change", async () => {
   const file = fileInput.files[0];
   if (!file) return;

   const epub = new EpubBook(file);
   await epub.parse();

   const metadata = epub.getMetadata();

   const book = {
      title: metadata.title,
      file: epub.getEpubBlob(),
   };

   await addBook(book);
   fileInput.value = "";

   await renderBookshelf();
});