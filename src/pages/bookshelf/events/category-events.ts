import {
   deleteCategory,
   renameCategory,
   shiftCategoryDisplayOrder,
   updateCategoryState,
} from '@src/database/categories/category-repository.ts';
import renderBookshelf from '../features/render-bookshelf.ts';
import { openFormFor } from '../features/overlays.ts';

async function handleCategoryAction(action: string | null, clickedCategory: HTMLElement): Promise<void> {
   const categoryId = Number(clickedCategory.getAttribute('data-category-id'));
   if (isNaN(categoryId)) throw new Error("Cannot find category id");
   
   switch (action) {
      case 'expand':
      case 'collapse': {
         const isExpanded = clickedCategory.classList.contains('expanded');
         await updateCategoryState(categoryId, !isExpanded);
         await renderBookshelf();
         break;
      }
      case 'rename': {
         const newCategoryName = await openFormFor('category-name') as string;
         const clickedCategoryName = clickedCategory.getAttribute('data-category-name');
         if (newCategoryName && newCategoryName !== clickedCategoryName) {
            await renameCategory(categoryId, newCategoryName);
            await renderBookshelf();
         }
         break;
      }
      case 'delete': {
         const confirmation = await openFormFor('confirmation') as boolean;
         if (confirmation) {
            await deleteCategory(categoryId);
            await renderBookshelf();
         }
         break;
      }
      case 'move-up': {
         await shiftCategoryDisplayOrder(categoryId, -1);
         await renderBookshelf();
         break;
      }
      case 'move-down': {
         await shiftCategoryDisplayOrder(categoryId, 1);
         await renderBookshelf();
         break;
      }
      default:
         throw new Error(`Unknown action: ${action}`);
   }
}
export default function bindCategoryEvents() {
   const bookshelf = document.getElementById('bookshelf');
   if (!bookshelf) throw new Error('Bookshelf element not found');

   bookshelf.addEventListener('click', async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedButton = target.closest('.category-actions button');
      if (!clickedButton) return;

      const clickedCategory = clickedButton.closest('.category') as HTMLElement;
      if (!clickedCategory) throw new Error('Clicked category not found');

      const action = clickedButton.getAttribute('data-action');
      await handleCategoryAction(action, clickedCategory);
   });
}
