import { getBooks } from "../../../database/db.js";
import EpubBook from "../../../epub/epub-book.js";

/**
 * Renders one stored book into the unorganised bookshelf.
 *
 * @param {Object} book - Book record from IndexedDB.
 * @param {Blob} book.file - Original EPUB file.
 * @returns {Promise<void>}
 */
async function renderBookCard(book) {
   const epub = new EpubBook(book.file);
   await epub.parse();

   const metadata = epub.getMetadata();
   const cover = epub.getCover();

   const bookshelf = document.getElementById("unorganised-bookshelf");

   const bookCard = document.createElement("article");
   bookCard.classList.add("book-card");

   const coverWrapper = document.createElement("div");
   coverWrapper.classList.add("book-cover-wrapper");

   if (cover) {
      const img = document.createElement("img");
      const coverUrl = URL.createObjectURL(cover);

      img.src = coverUrl;
      img.alt = `${metadata.title} cover`;

      img.onload = () => {
         URL.revokeObjectURL(coverUrl);
      };

      coverWrapper.appendChild(img);
   }

   const bookMetadata = document.createElement("div");
   bookMetadata.classList.add("book-metadata");

   const title = document.createElement("h3");
   title.classList.add("book-title");
   title.textContent = metadata.title;

   const author = document.createElement("p");
   author.classList.add("book-author");
   author.textContent = metadata.author;

   bookMetadata.append(title, author);

   bookCard.append(
      coverWrapper,
      bookMetadata
   );

   bookshelf.appendChild(bookCard);
}

/**
 * Loads and renders all stored books.
 *
 * @returns {Promise<void>}
 */
export default async function renderBookshelf() {
   const books = await getBooks();

   document.getElementById("unorganised-bookshelf").innerHTML = "";
   for (const book of books) {
      await renderBookCard(book);
   }
}
