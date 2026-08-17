import { addBook, getBooksByCategory } from "../../../database/book-repository.js";
import { addCategory, getAllCategories } from "../../../database/category-repository.js";
import { BookRecord } from "../../../database/schema.js";
import { STRING_FORM_RULES } from "./open-forms.js";
import { getUserPreferences } from "../../../database/user-preference-repository.js";
import EpubBook from "../../../epub/epub-book.js";

/**
 * 
 * @param {BookRecord} bookRecord
 * @returns {HTMLElement} The rendered book card element.
 */
function renderBookCard(bookRecord) {
   const epub = EpubBook.fromRecord(bookRecord);

   const template = document.getElementById("book-card-template");
   const container = template.content.cloneNode(true).querySelector(".book-card");
   container.setAttribute("data-book-id", epub.getId());

   const metadata = epub.getMetadata();
   const title = metadata.title > STRING_FORM_RULES.maxLength
      ? metadata.title.slice(0, STRING_FORM_RULES.maxLength - 3) + "..."
      : metadata.title;
   const coverUrl = URL.createObjectURL(epub.getCover());
   const creator = metadata.creator ?? "Unknown Creator";
   const language = metadata.language ?? "Unknown Language";

   const coverElement = container.querySelector(".cover-wrapper > img");
   coverElement.src = coverUrl;
   coverElement.setAttribute("alt", `Book cover of ${title}`);
   coverElement.setAttribute("title", title);

   const metadataElement = container.querySelector(".metadata");
   metadataElement.querySelector(".title").textContent = title;
   metadataElement.querySelector(".creator").textContent = creator;
   metadataElement.querySelector(".language").textContent = language;

   const progressBarElement = container.querySelector(".progress-bar");
   progressBarElement.style.setProperty("--progress", `${Math.random() * 100}%`); // todo: replace with actual progress value later

   return container;
}

/**
 * 
 * @param {BookRecord} books 
 * @param {string | null} searchText 
 * @param {"title-asc" | "tile-desc"} sortOrder 
 * @returns {BookRecord[]}
 */
function sortAndFilterBooks(books, searchText, sortOrder) {
   if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      books = books.filter(book => {
         return book.title.toLowerCase().includes(lowerSearchText) ||
            book.creator.toLowerCase().includes(lowerSearchText) ||
            book.language.toLowerCase().includes(lowerSearchText);
      });
   }

   if (sortOrder === "title-asc" || !sortOrder) {
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

   return books;
}

function renderCategory(categoryRecord, bookRecords) {
   // Only shows category name within word limit
   const categoryName = categoryRecord.name.length > STRING_FORM_RULES.maxLength
      ? categoryRecord.name.slice(0, STRING_FORM_RULES.maxLength - 3) + "..."
      : categoryRecord.name;
      
   const categoryElement = document.getElementById("category-template")
      .content.cloneNode(true)
      .querySelector(".category");
   categoryElement.setAttribute("data-category-name", categoryName);

   const categoryHeaderElement = categoryElement.querySelector(".category-header");
   categoryHeaderElement.querySelector("h2").textContent = categoryName;

   const categoryActionsElement = categoryHeaderElement.querySelector(".category-actions");
   if (categoryName === "Your Books") {
      categoryActionsElement.querySelector(".rename-category-btn")?.remove();
      categoryActionsElement.querySelector(".delete-category-btn")?.remove();
      categoryActionsElement.querySelector(".move-category-up-btn")?.remove();
      categoryActionsElement.querySelector(".move-category-down-btn")?.remove();
   }

   const isExpanded = categoryRecord.expanded;
   categoryElement.classList.toggle("expanded", isExpanded);
   categoryElement.classList.toggle("collapsed", !isExpanded);
   categoryActionsElement.querySelector(".expand-category-btn").hidden = !isExpanded;
   categoryActionsElement.querySelector(".collapse-category-btn").hidden = isExpanded;

   if (!isExpanded) return categoryElement;

   const bookCardListElement = categoryElement.querySelector(".book-card-list");
   for (const book of bookRecords) {
      const bookCard = renderBookCard(book);
      bookCardListElement.appendChild(bookCard);
   }

   return categoryElement;
}

/**
 * Loads and renders all stored books.
 *
 * @param {string | null} searchText - The text to filter books by title, creator, or language.
 * @returns {Promise<void>}
 */
export default async function renderBookshelf(searchText = "") {
   const bookshelf = document.getElementById("bookshelf");
   bookshelf.replaceChildren();

   let categories;
   try { categories = await getAllCategories(); }
   catch (error) {
      // todo: implement a better way to show errors to users.
      console.error("Error fetching categories:", error);
      return;
   }

   categories = categories.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

   const categoryElementArray = [];
   for (const category of categories) {
      let books;
      try { books = await getBooksByCategory(category.id); }
      catch (error) { console.error(`Error fetching books for category ${category.name}:`, error); }

      const userPreferences = await getUserPreferences();
      books = sortAndFilterBooks(books, searchText, userPreferences.titleSortOrder);

      const categoryElement = renderCategory(category, books);
      categoryElementArray.push(categoryElement);
   }

   bookshelf.replaceChildren(...categoryElementArray);
}


