import { getAllBooks, getAllCategories, addBook, addCategory, getBooksByCategory } from "../../../database/database.js";
import { BookRecord } from "../../../database/schema.js";
import EpubBook from "../../../epub/epub-book.js";

/**
 * 
 * @param {Object} book 
 * @returns {HTMLElement} The rendered book card element.
 */
async function renderBookCard(bookRecord) {
   const epubBook = await EpubBook.fromRecord(bookRecord);
   const metadata = epubBook.getMetadata();
   const cover = epubBook.getCover();

   const card = document.createElement('article');
   card.className = 'book-card';

   const coverWrapper = document.createElement('div');
   coverWrapper.className = 'cover-wrapper';

   const img = document.createElement('img');
   img.src = cover ? URL.createObjectURL(cover) : './assets/test.jpg';
   img.alt = `Cover of ${metadata.title}`;
   coverWrapper.append(img);

   const meta = document.createElement('div');
   meta.className = 'metadata';

   const title = document.createElement('h3');
   title.className = 'title';
   title.textContent = metadata.title;

   const creator = document.createElement('p');
   creator.className = 'creator';
   creator.textContent = `by ${metadata.creator}`;

   const language = document.createElement('p');
   language.className = 'language';
   language.textContent = metadata.language;

   meta.append(title, creator, language);

   const progress = document.createElement('div');
   progress.className = 'progress-bar';
   progress.textContent = '0%';

   card.append(coverWrapper, meta, progress);
   return card;
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
      shelf.id = category.name;
      shelf.innerHTML = '';

      const categoryName = document.createElement("h2");
      categoryName.textContent = category.name;
      shelf.append(categoryName);

      const books = await getBooksByCategory(category.id);

      for (const book of books) {
         const bookCard = await renderBookCard(book);
         shelf.append(bookCard);
         console.log(`Rendered book: ${book.title} (ID: ${book.bookId}) in category: ${category.name}`);
      }

      bookshelf.append(shelf);
   }
}
