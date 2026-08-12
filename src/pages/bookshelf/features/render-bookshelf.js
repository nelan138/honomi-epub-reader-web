import { getAllBooks, getAllCategories, addBook, addCategory, getBooksByCategory } from "../../../database/database.js";
import { BookRecord } from "../../../database/schema.js";
import EpubBook from "../../../epub/epub-book.js";
import initBookCardActions from "./book-card-actions.js";
import initCategoryActions from "./category-actions.js";

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
   bookCard.setAttribute("data-book-id", epubBook.getId());
   bookCard.innerHTML = `
      <div class="cover-wrapper">
         <img src="${URL.createObjectURL(epubBook.getCover())}" alt="Book cover of ${metadata.title}">
      </div>
      <div class="metadata">
         <h3 class="title">${metadata.title}</h3>
         <p class="creator">by ${metadata.creator}</p>
         <p class="language">${metadata.language}</p>
      </div>

      <!-- FIXME: Will get rid of the random in the future, replace with (epubBook.getProgress() ?? 0) -->
      <div class="progress-bar" style="--progress: ${Math.floor(Math.random() * 101)}%"></div>

      <div class="book-card-actions">
         <button type="button" class="rename-book-btn">
            <i class="fa-solid fa-pen-to-square"></i>
         </button>
         <button type="button" class="change-book-category-btn">
            <i class="fa-solid fa-right-left"></i>
         </button>
         <button type="button" class="delete-book-btn">
            <i class="fa-solid fa-trash"></i>
         </button>
      </div>
   `
   return bookCard;
}

/**
 * Loads and renders all stored books.
 *
 * @returns {Promise<void>}
 */
export default async function renderBookshelf() {
   // const bookshelf = document.getElementById("bookshelf");
   const categoryList = document.getElementById("category-list");

   categoryList.replaceChildren();
   const categories = await getAllCategories();

   for (const category of categories) {
      console.log(`Rendering category: ${category.name} (ID: ${category.id})`);

      const shelf = document.createElement("section");
      shelf.classList.add("category");
      shelf.setAttribute("data-category-name", category.name);
      shelf.innerHTML = `
         <header class="category-header">
            <h2>${category.name}</h2>
            <div class="category-actions">
            </div>
         </header>
      `;

      const categoryActions = shelf.querySelector(".category-actions");
      if (category.name === "Your Books") {
         categoryActions.innerHTML = `
            <button type="button" class="toggle-category-btn">
               <i class="fa-solid fa-caret-down"></i>
            </button>
         `
      }
      else categoryActions.innerHTML = `
         <button type="button" class="rename-category-btn">
            <i class="fa-solid fa-pencil"></i>
         </button>
         <button type="button" class="toggle-category-btn">
            <i class="fa-solid fa-caret-down"></i>
         </button>
         <button type="button" class="delete-category-btn">
            <i class="fa-solid fa-x"></i>
         </button>
      `

      if (!category.expanded) {
         shelf.querySelector('.toggle-category-btn').innerHTML = `<i class="fa-solid fa-caret-right"></i>`;
         categoryList.append(shelf);
         console.log("  Done (collapsed)")
         continue;
      }

      const bookCardList = document.createElement("div");
      bookCardList.className = "book-card-list";
      const books = await getBooksByCategory(category.id);

      for (const book of books) {
         const bookCard = await renderBookCard(book);
         bookCardList.append(bookCard);
         console.log(`  ー Rendered book: ${book.title} (ID: ${book.id}) in category: ${category.name}`);
      }

      shelf.append(bookCardList);
      categoryList.append(shelf);
      console.log("  ー / Done")
   }

   initBookCardActions();
   initCategoryActions();
}


