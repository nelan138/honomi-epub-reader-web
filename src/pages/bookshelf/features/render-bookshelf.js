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
 * @param {string | null} searchText - The text to filter books by title, creator, or language.
 * @param {string | null} sortOrder - The order to sort books. Can be "title-asc" or "title-desc".
 * @returns {Promise<void>}
 */
export default async function renderBookshelf(searchText = "", sortOrder = "title-asc") {
   const bookshelf = document.getElementById("bookshelf");
   bookshelf.replaceChildren();

   let categories;
   try { 
      categories = await getAllCategories(); 
   }
   catch (error) {
      // todo: implement a better way to show errors to users.
      console.error("Error fetching categories:", error);
      return;
   }

   categories = categories.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

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
         categoryActionsElement.querySelector(".move-category-up-btn")?.remove();
         categoryActionsElement.querySelector(".move-category-down-btn")?.remove();
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

      if (searchText) {
         const lowerSearchText = searchText.toLowerCase();
         books = books.filter(book => {
            return book.title.toLowerCase().includes(lowerSearchText) ||
               book.creator.toLowerCase().includes(lowerSearchText) ||
               book.language.toLowerCase().includes(lowerSearchText);
         });
      }

      if (sortOrder === "title-asc") {
         books.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            return titleA.localeCompare(titleB);
         });
      }
      else if (sortOrder === "title-desc") {
         books.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            return titleB.localeCompare(titleA);
         });
      }

      for (const book of books) {
         const bookCard = await renderBookCard(book);
         bookCardListElement.appendChild(bookCard);
      }

      categoryElementArray.push(categoryElement);
   }

   bookshelf.replaceChildren(...categoryElementArray);
}


