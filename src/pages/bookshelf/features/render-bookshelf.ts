import { defaultCategory } from '@src/database/database.ts';
import { getBooksByCategory } from '@src/database/book-repository.ts';
import { getAllCategories } from '@src/database/category-repository.ts';
import { getUserPreferences } from '@src/database/user-preference-repository.ts';
import type { TitleSortOrder } from '@src/database/user-preference-repository.ts';
import type { BookRecord } from '@src/database/book-repository.ts';
import type { CategoryRecord } from '@src/database/category-repository.ts';

import { STRING_FORM_RULES } from './open-forms.ts';
import EpubBook from '@src/epub/epub-book.ts';

function normalizeTitle(title: string | null | undefined): string {
   if (!title) return 'Unknown';
   return title.length > STRING_FORM_RULES.maxLength ? title.slice(0, STRING_FORM_RULES.maxLength - 3) + '...' : title;
}

function renderBookCard(record: BookRecord): HTMLElement {
   const epub = EpubBook.fromRecord(record);

   const template = document.getElementById('book-card-template')! as HTMLTemplateElement;
   const clone = template.content.cloneNode(true) as DocumentFragment;
   const container = clone.querySelector('.book-card')! as HTMLElement;
   container.setAttribute('data-book-id', String(epub.getId()));

   const metadata = epub.getMetadata();

   const title = normalizeTitle(metadata.title);
   const cover = epub.getCover();
   const coverUrl = cover ? URL.createObjectURL(cover) : `cover of ${title} not found`;
   const creator = metadata.creator ?? 'Unknown';
   const language = metadata.language ?? 'Unknown';

   const coverElement = container.querySelector('.cover-wrapper > img')! as HTMLImageElement;
   coverElement.src = coverUrl;
   coverElement.setAttribute('alt', `Book cover of ${title}`);
   coverElement.setAttribute('title', title);

   const metadataElement = container.querySelector('.metadata')!;
   metadataElement.querySelector('.title')!.textContent = title;
   metadataElement.querySelector('.creator')!.textContent = creator;
   metadataElement.querySelector('.language')!.textContent = language;

   const progressBarElement = container.querySelector('.progress-bar')! as HTMLElement;
   // todo: replace with actual progress value later
   progressBarElement.style.setProperty('--progress', `${Math.random() * 100}%`);

   return container;
}

function sortAndFilterBooks(books: BookRecord[], searchText: string | null, sortOrder: TitleSortOrder): BookRecord[] {
   if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      books = books.filter((book) => {
         const metadata = book.metadata;
         if (!metadata) return false;

         const title = metadata.title?.toLowerCase() ?? '';
         const creator = metadata.creator?.toLowerCase() ?? '';
         const language = metadata.language?.toLowerCase() ?? '';

         return (
            title.includes(lowerSearchText)
            || creator.includes(lowerSearchText)
            || language.includes(lowerSearchText)
         );
      });
   }

   return books.sort((a, b) => {
      const titleA = a.metadata?.title?.toLowerCase() ?? '';
      const titleB = b.metadata?.title?.toLowerCase() ?? '';

      return sortOrder === 'title-desc' ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB);
   });
}

function renderCategory(categoryRecord: CategoryRecord, bookRecords: BookRecord[]): HTMLElement {

   const categoryName = normalizeTitle(categoryRecord.name);

   const template = document.getElementById('category-template')! as HTMLTemplateElement;
   const clone = template.content.cloneNode(true) as DocumentFragment;
   const categoryElement = clone.querySelector('.category')! as HTMLElement;

   categoryElement.setAttribute('data-category-id', String(categoryRecord.id));
   categoryElement.setAttribute('data-category-name', categoryRecord.name);

   const categoryHeaderElement = categoryElement.querySelector('.category-header')!;
   const categoryActionsElement = categoryHeaderElement.querySelector('.category-actions')!;
   categoryHeaderElement.querySelector('h2')!.textContent = categoryName;

   // * Buttons & Actions Availability

   if (categoryName === defaultCategory.name) {
      categoryActionsElement.querySelector('.rename-category-btn')?.remove();
      categoryActionsElement.querySelector('.delete-category-btn')?.remove();
      categoryActionsElement.querySelector('.move-category-up-btn')?.remove();
      categoryActionsElement.querySelector('.move-category-down-btn')?.remove();
   }

   const isExpanded = categoryRecord.expanded;

   const expandBtn = categoryActionsElement.querySelector('.expand-category-btn')! as HTMLElement;
   const collapseBtn = categoryActionsElement.querySelector('.collapse-category-btn')! as HTMLElement;

   expandBtn.hidden = isExpanded;
   collapseBtn.hidden = !isExpanded;

   categoryElement.classList.toggle('expanded', isExpanded);
   categoryElement.classList.toggle('collapsed', !isExpanded);

   if (!isExpanded) return categoryElement;

   const bookCardListElement = categoryElement.querySelector('.book-card-list')!;
   for (const book of bookRecords) {
      const bookCard = renderBookCard(book);
      bookCardListElement.appendChild(bookCard);
   }

   return categoryElement;
}

export default async function renderBookshelf(searchText = ''): Promise<void> {
   const bookshelf = document.getElementById('bookshelf')!;
   bookshelf.replaceChildren();

   let categories;
   try {
      categories = await getAllCategories();
   }
   catch (error) {
      console.error('Error fetching categories:', error);
      return;
   }
   categories = categories.sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity));

   const categoryElementArray = [];
   for (const category of categories) {
      let books: BookRecord[] = [];
      try {
         books = await getBooksByCategory(category.id!);
      }
      catch (error) {
         console.error(`Error fetching books for category ${category.name}:`, error);
      }

      const userPreferences = await getUserPreferences();
      books = sortAndFilterBooks(books, searchText, userPreferences.titleSortOrder);

      const categoryElement = renderCategory(category, books);
      categoryElementArray.push(categoryElement);
   }

   bookshelf.replaceChildren(...categoryElementArray);
}
