import EpubBook from "../../../epub/epub-book.js";
import { addBook, addCategory } from "../../../database/database.js";
import renderBookshelf from "./render-bookshelf.js";

const importBtn = document.getElementById("import-book-btn");
const fileInput = document.getElementById("epub-file-input");

importBtn.addEventListener("click", () => { fileInput.click() });
fileInput.addEventListener("change", async () => {
   const file = fileInput.files[0];
   if (!file) return;

   const epub = await EpubBook.fromFile(file);

   // ! Newly imported books always go to "Your Library"
   const metadata = epub.getMetadata();

   const book = {
      categoryId: await addCategory("Your Library"),

      title: metadata.title,
      creator: metadata.creator,
      language: metadata.language,
      publisher: metadata.publisher,
      identifier: metadata.identifier,

      cover: epub.getCover(),
      progress: 0,

      epubFile: epub.getEpubFile(),
      opfPath: epub.getOpfPath(),
      manifest: epub.getManifest(),
      navigation: epub.getNavigation(),
      spine: epub.getSpine(),
   };

   await addBook(book);
   await renderBookshelf();
   fileInput.value = "";
});
