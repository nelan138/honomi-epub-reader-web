import { changeBookCategory, deleteBook, renameBook } from '@src/database/books/book-repository.ts';
import { getCategoryByName } from '@src/database/categories/category-repository.ts';

import renderBookshelf from '../features/render-bookshelf.ts';
import { openFormFor } from '../features/overlays.ts';

async function handleBookCardAction(action: string | null, clickedBookCard: HTMLElement): Promise<void> {
   const bookId = Number(clickedBookCard.getAttribute('data-book-id')) || undefined;
   if (bookId === undefined) throw new Error("Cannot find book id");

   switch (action) {
      case 'rename': {
         const title = await openFormFor('book-name') as string;
         if (title) {
            await renameBook(bookId, title);
            await renderBookshelf();
         }
         break;
      }
      case 'change-category': {
         const selectedCategory = await openFormFor('category-selection') as string;
         if (selectedCategory) {
            const category = await getCategoryByName(selectedCategory);
            await changeBookCategory(bookId, category.id);
            await renderBookshelf();
         }
         break;
      }
      case 'delete': {
         const confirmation = await openFormFor('confirmation') as boolean;
         if (confirmation) {
            await deleteBook(bookId);
            await renderBookshelf();
         }
         break;
      }
      default:
         throw new Error(`Unknown action: ${action}`);
   }
}

export default function bindBookCardEvents() {
   const bookshelf = document.getElementById('bookshelf');
   if (!bookshelf) throw new Error('Bookshelf element not found');

   bookshelf.addEventListener('click', async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedButton = target.closest('.book-card-actions button');
      if (!clickedButton) return;

      const clickedBookCard = clickedButton.closest('.book-card') as HTMLElement;
      if (!clickedBookCard) throw new Error('Clicked book card not found');

      const action = clickedButton.getAttribute('data-action');

      await handleBookCardAction(action, clickedBookCard);
   });
}
