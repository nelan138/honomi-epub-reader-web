import { getBooks, getCategories } from "../../../database/database.js";
import EpubBook from "../../../epub/epub-book.js";

/**
 * Creates a card for one stored book.
 *
 * @param {Object} book - Book record from IndexedDB.
 * @param {number} book.categoryId - Category ID of the book.
 * @param {Blob} book.file - Original EPUB file.
 * @returns {Promise<HTMLElement>}
 */
async function renderBookCard(book) {
   const epub = new EpubBook(book.file);
   await epub.parse();

   // Metadata
   const metadata = epub.getMetadata();

   const title = document.createElement("h3");
   title.classList.add("title");
   title.textContent = metadata.title;
   const author = document.createElement("p");
   author.classList.add("author");
   author.textContent = `by ${metadata.author}`;
   const language = document.createElement("div");
   language.classList.add("language");
   language.textContent = metadata.language;

   const bookMetadata = document.createElement("div");
   bookMetadata.classList.add("metadata");
   bookMetadata.append(title, author, language);

   // Book cover
   const coverWrapper = document.createElement("div");
   coverWrapper.classList.add("cover-wrapper");

   const cover = epub.getCover();
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

   // Progress bar
   const progressBar = document.createElement("div");
   progressBar.classList.add("progress-bar");
   progressBar.textContent = `${book.progress}%`
   progressBar.style.setProperty("--progress", "42%");

   const bookCard = document.createElement("article");
   bookCard.classList.add("book-card");
   bookCard.append(
      coverWrapper,
      bookMetadata,
      progressBar,
   );

   return bookCard;
}

/**
 * Loads and renders all stored books.
 *
 * @returns {Promise<void>}
 */
export default async function renderBookshelf() {
   const books = await getBooks();
   const categories = await getCategories();

   for (const category of categories) {
      let shelf = document.getElementById(category.name);

      if (!shelf) {
         shelf = document.createElement("section");
         shelf.classList.add("category");
         shelf.id = category.name;
         document.querySelector(".bookshelf").append(shelf);
      }

      shelf.replaceChildren();

      const categoryName = document.createElement("h2");
      categoryName.textContent = category.name;
      shelf.append(categoryName);

      for (const book of books) {
         if (book.categoryId !== category.id) continue;

         const bookCard = await renderBookCard(book);
         shelf.append(bookCard);
      }
   }
}
