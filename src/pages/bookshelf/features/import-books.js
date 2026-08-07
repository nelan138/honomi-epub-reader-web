import { EpubBook } from "../../../epub/epub-book.js";
import { addBook } from "../../../database/db.js";

const importBtn = document.getElementById("import-book-btn");
const fileInput = document.getElementById("epub-file-input");

importBtn.addEventListener("click", () => { fileInput.click() });
fileInput.addEventListener("change", async () => {
   const file = fileInput.files[0];
   if (!file) return;

   const epub = await EpubBook.fromFile(file);
   const metadata = epub.getMetadata();

   const book = {
      title: metadata.title,
      author: metadata.author,
      cover: epub.getCover(),
   };

   await addBook(book);
   fileInput.value = "";
});