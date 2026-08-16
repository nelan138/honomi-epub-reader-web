import { getAllBooks, addBook, getBooksByCategory } from "../../../database/book-repository.js";
import { addCategory, getAllCategories } from "../../../database/category-repository.js";
import { BookRecord } from "../../../database/schema.js";
import EpubBook from "../../../epub/epub-book.js";
import bindBookCardEvents from "../events/book-card-events.js";
import bindCategoryEvents from "../events/category-events.js";
import { STRING_FORM_RULES } from "./open-forms.js";

/**
 * 
 * @param {BookRecord} bookRecord
 * @returns {HTMLElement} The rendered book card element.
 */
async function renderBookCard(bookRecord) {
   const epubBook = await EpubBook.fromRecord(bookRecord);
   const metadata = epubBook.getMetadata();

   const template = document.getElementById("book-card-template");
   const container = template.content.cloneNode(true).querySelector(".book-card");
   container.setAttribute("data-book-id", bookRecord.id);

   const coverElement = container.querySelector(".cover-wrapper > img");
   coverElement.src = URL.createObjectURL(epubBook.getCover());
   coverElement.setAttribute("alt", `Book cover of ${metadata.title}`);

   const metadataElement = container.querySelector(".metadata");
   metadataElement.querySelector(".title").textContent = metadata.title;
   metadataElement.querySelector(".creator").textContent = metadata.creator;
   metadataElement.querySelector(".language").textContent = metadata.language;

   return container;
}

/**
 * Loads and renders all stored books.
 *
 * @returns {Promise<void>}
 */
export default async function renderBookshelf() {
   const bookshelf = document.getElementById("bookshelf");
   bookshelf.replaceChildren();

   let categories;
   try { categories = await getAllCategories(); }
   catch (error) {
      // todo: implement a better way to show errors to users.
      console.error("Error fetching categories:", error);
      return;
   }

   const categoryElementArray = [];
   for (const category of categories) {
      const categoryElement = document.getElementById("category-template")
         .content.cloneNode(true)
         .querySelector(".category");
      categoryElement.setAttribute("data-category-name", category.name);

      const categoryHeaderElement = categoryElement.querySelector(".category-header");
      categoryHeaderElement.querySelector("h2").textContent = category.name;

      const categoryActionsElement = categoryHeaderElement.querySelector(".category-actions");
      if (category.name === "Your Books") {
         categoryActionsElement.querySelector(".rename-category-btn")?.remove();
         categoryActionsElement.querySelector(".delete-category-btn")?.remove();
      }

      const isExpanded = category.expanded;
      categoryElement.classList.toggle("expanded", isExpanded);
      categoryElement.classList.toggle("collapsed", !isExpanded);
      categoryActionsElement.querySelector(".expand-category-btn").hidden = !isExpanded;
      categoryActionsElement.querySelector(".collapse-category-btn").hidden = isExpanded;
      
      if (!category.expanded) {
         categoryElementArray.push(categoryElement);
         continue;
      }

      const bookCardListElement = categoryElement.querySelector(".book-card-list");
      let books;
      try { books = await getBooksByCategory(category.id); }
      catch (error) { console.error(`Error fetching books for category ${category.name}:`, error); }

      for (const book of books) {
         const bookCard = await renderBookCard(book);
         bookCardListElement.appendChild(bookCard);
      }

      categoryElementArray.push(categoryElement);
   }

   bookshelf.replaceChildren(...categoryElementArray);
}


