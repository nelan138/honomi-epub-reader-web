import { addBook, getBooksByCategory } from "../../../database/book-repository.js";
import { addCategory, getAllCategories } from "../../../database/category-repository.js";
import { STRING_FORM_RULES } from "./open-forms.js";
import { getUserPreferences } from "../../../database/user-preference-repository.js";
import EpubBook from "../../../epub/epub-book.js";
import { defaultCategoryName, type BookRecord, type CategoryRecord } from "../../../database/schema.js";

function renderBookCard(record: BookRecord): HTMLElement {
   const epub = EpubBook.fromRecord(record);

   const template = document.getElementById("book-card-template")! as HTMLTemplateElement;
   const clone = template.content.cloneNode(true) as DocumentFragment;
   const container = clone.querySelector(".book-card")! as HTMLElement;
   container.setAttribute("data-book-id", String(epub.getId()));

   const metadata = epub.getMetadata();
   metadata.title = metadata.title ?? "Unknown Title";
   metadata.title = metadata.title.length > STRING_FORM_RULES.maxLength
      ? metadata.title.slice(0, STRING_FORM_RULES.maxLength - 3) + "..."
      : metadata.title;

   const title = metadata.title;
   const cover = epub.getCover();
   const coverUrl = cover ? URL.createObjectURL(cover) : `cover of ${title} not found`;
   const creator = metadata.creator ?? "Unknown Creator";
   const language = metadata.language ?? "Unknown Language";

   const coverElement = container.querySelector(".cover-wrapper > img")! as HTMLImageElement;
   coverElement.src = coverUrl;
   coverElement.setAttribute("alt", `Book cover of ${title}`);
   coverElement.setAttribute("title", title);

   const metadataElement = container.querySelector(".metadata")!;
   metadataElement.querySelector(".title")!.textContent = title;
   metadataElement.querySelector(".creator")!.textContent = creator;
   metadataElement.querySelector(".language")!.textContent = language;

   const progressBarElement = container.querySelector(".progress-bar")! as HTMLElement;
   progressBarElement.style.setProperty("--progress", `${Math.random() * 100}%`); // todo: replace with actual progress value later

   return container;
}

function sortAndFilterBooks(books: BookRecord[], searchText: string | null, sortOrder: "title-asc" | "title-desc"): BookRecord[] {
   if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      books = books.filter(book => {
         const metadata = book.metadata; 
         if (!metadata) return false;
         metadata.title = metadata.title ?? "";
         metadata.creator = metadata.creator ?? "";
         metadata.language = metadata.language ?? "";

         return metadata?.title.toLowerCase().includes(lowerSearchText) ||
            metadata?.creator.toLowerCase().includes(lowerSearchText) ||
            metadata?.language.toLowerCase().includes(lowerSearchText);
      });
   }

   if (sortOrder === "title-asc" || !sortOrder) {
      books.sort((a, b) => {
         if (!a.metadata || !b.metadata) return 0;
         a.metadata.title = a.metadata.title ?? "";
         b.metadata.title = b.metadata.title ?? "";

         const titleA = a.metadata?.title.toLowerCase() ?? "";
         const titleB = b.metadata?.title.toLowerCase() ?? "";

         return titleA.localeCompare(titleB);
      });
   }
   else if (sortOrder === "title-desc") {
      books.sort((a, b) => {
         if (!a.metadata || !b.metadata) return 0;
         a.metadata.title = a.metadata.title ?? "";
         b.metadata.title = b.metadata.title ?? "";

         const titleA = a.metadata?.title.toLowerCase() ?? "";
         const titleB = b.metadata?.title.toLowerCase() ?? "";

         return titleB.localeCompare(titleA);
      });
   }

   return books;
}

function renderCategory(categoryRecord: CategoryRecord, bookRecords: BookRecord[]): HTMLElement {
   // Only shows category name within word limit
   const categoryName = categoryRecord.name.length > STRING_FORM_RULES.maxLength
      ? categoryRecord.name.slice(0, STRING_FORM_RULES.maxLength - 3) + "..."
      : categoryRecord.name;

   const template = document.getElementById("category-template")! as HTMLTemplateElement;
   const clone = template.content.cloneNode(true) as DocumentFragment;
   const categoryElement = clone.querySelector(".category")! as HTMLElement;

   const categoryHeaderElement = categoryElement.querySelector(".category-header")!;
   categoryHeaderElement.querySelector("h2")!.textContent = categoryName;

   const categoryActionsElement = categoryHeaderElement.querySelector(".category-actions")!;
   if (categoryName === defaultCategoryName) {
      categoryActionsElement.querySelector(".rename-category-btn")?.remove();
      categoryActionsElement.querySelector(".delete-category-btn")?.remove();
      categoryActionsElement.querySelector(".move-category-up-btn")?.remove();
      categoryActionsElement.querySelector(".move-category-down-btn")?.remove();
   }

   const isExpanded = categoryRecord.expanded;
   categoryElement.classList.toggle("expanded", Boolean(isExpanded));
   categoryElement.classList.toggle("collapsed", !isExpanded);

   const expandBtn = categoryActionsElement.querySelector(".expand-category-btn")! as HTMLElement;
   expandBtn.hidden = !isExpanded;

   const collapseBtn = categoryActionsElement.querySelector(".collapse-category-btn")! as HTMLElement;
   collapseBtn.hidden = Boolean(isExpanded);

   if (!isExpanded) return categoryElement;

   const bookCardListElement = categoryElement.querySelector(".book-card-list")!;
   for (const book of bookRecords) {
      const bookCard = renderBookCard(book);
      bookCardListElement.appendChild(bookCard);
   }

   return categoryElement;
}

export default async function renderBookshelf(searchText = ""): Promise<void> {
   const bookshelf = document.getElementById("bookshelf")!;
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
      let books: BookRecord[] = [];
      try { books = await getBooksByCategory(category.id!); }
      catch (error) { console.error(`Error fetching books for category ${category.name}:`, error); }

      const userPreferences = await getUserPreferences();
      books = sortAndFilterBooks(books, searchText, userPreferences.titleSortOrder);

      const categoryElement = renderCategory(category, books);
      categoryElementArray.push(categoryElement);
   }

   bookshelf.replaceChildren(...categoryElementArray);
}


