import { getAllBooks, getAllCategories, addBook, addCategory, getBooksByCategory } from "../../../database/database.js";
import { BookRecord } from "../../../database/schema.js";
import EpubBook from "../../../epub/epub-book.js";

/**
 * 
 * @param {BookRecord} bookRecord
 * @returns {HTMLElement} The rendered book card element.
 */
async function renderBookCard(bookRecord) {
   const epubBook = await EpubBook.fromRecord(bookRecord);
   const metadata = epubBook.getMetadata();

   const bookCard = document.createElement('article');
   bookCard.className = "book-card";
   bookCard.innerHTML = `
      <div class="cover-wrapper">
         <img src="${URL.createObjectURL(epubBook.getCover())}" alt="Book cover of ${metadata.title}">
      </div>
      <div class="metadata">
         <h3 class="title">${metadata.title}</h3>
         <p class="creator">by ${metadata.creator}</p>
         <p class="language">${metadata.language}</p>
      </div>
      <div class="progress-bar">${(epubBook.getProgress())}%</div> 
   `
   return bookCard;
}

/**
 * Loads and renders all stored books.
 *
 * @returns {Promise<void>}
 */
export default async function renderBookshelf() {
   const bookshelf = document.getElementById("bookshelf");
   const categories = await getAllCategories();

   for (const category of categories) {
      console.log(`Rendering category: ${category.name} (ID: ${category.id})`);

      const shelf = document.getElementById(category.name) || document.createElement("section");
      shelf.classList.add("category");
      shelf.id = category.name;
      shelf.innerHTML = `<h2>${category.name}</h2>`;

      const bookCardList = document.createElement("div");
      bookCardList.className = "book-card-list";
      const books = await getBooksByCategory(category.id);

      for (const book of books) {
         const bookCard = await renderBookCard(book);
         bookCardList.append(bookCard);
         console.log(`  Rendered book: ${book.title} (ID: ${book.id}) in category: ${category.name}`);
      }

      shelf.append(bookCardList);
      bookshelf.append(shelf);
   }
}
