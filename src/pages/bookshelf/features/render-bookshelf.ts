import { defaultCategory } from '@src/database/database.defaults.ts';
import { getBooksByCategory } from '@src/database/books/book-repository.ts';
import { getAllCategories } from '@src/database/categories/category-repository.ts';
import { getUserPreferences } from '@src/database/user-settings/user-setting-repository.ts';
import type { TitleSortOrder } from '@src/database/user-settings/user-setting.types.ts';
import type { BookRecord } from '@src/database/books/book.types.ts';
import type { CategoryRecord } from '@src/database/categories/category.types.ts';

import { STRING_FORM_RULES } from './overlays.ts';

function normalizeTitle(title: string | null | undefined): string {
   if (!title) return 'Unknown';
   return title.length > STRING_FORM_RULES.maxLength ? title.slice(0, STRING_FORM_RULES.maxLength - 3) + '...' : title;
}

function renderBookCard(record: BookRecord): HTMLElement {
   const template = document.getElementById('book-card-template')! as HTMLTemplateElement;
   const clone = template.content.cloneNode(true) as DocumentFragment;

   const container = clone.querySelector('.book-card')! as HTMLElement;
   container.setAttribute('data-book-id', record.id?.toString() ?? '');

   const metadata = record.metadata;
   if (metadata) {
      const title = normalizeTitle(metadata.title);

      const cover = record.cover;
      const coverUrl = cover ? URL.createObjectURL(cover) : `cover of ${title} not found`;
      const creator = metadata.creator;
      const language = metadata.language;

      const coverElement = container.querySelector('.cover-wrapper > img')! as HTMLImageElement;
      coverElement.src = coverUrl;
      coverElement.setAttribute('alt', `Book cover of ${title}`);
      coverElement.setAttribute('title', title);

      const metadataElement = container.querySelector('.metadata')!;

      metadataElement.querySelector('.title')!.textContent = title;
      metadataElement.querySelector('.creator')!.textContent = creator ?? 'Unknown';
      metadataElement.querySelector('.language')!.textContent = language ?? 'Unknown';
   }

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
         // for (const book of books) {
         //    console.log('Manifest of', book.metadata.title);
         //    console.table(
         //       [...book.manifest.entries()].map(([id, item]) => ({
         //          id,
         //          href: item.href,
         //          resolvedPath: item.resolvedPath,
         //          mediaType: item.mediaType,
         //          properties: item.properties.join(', '),
         //       })),
         //    );

         //    console.log('Navigation of', book.metadata.title);
         //    console.table(
         //       book.navigation.map((item) => ({
         //          label: item.label,
         //          href: item.href,
         //          resolvedPath: item.resolvedPath,
         //          fragment: item.fragment,
         //          childCount: item.children.length,
         //       })),
         //    );

         //    console.log('Spine of', book.metadata.title);
         //    console.table(book.spine);
         // }
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
