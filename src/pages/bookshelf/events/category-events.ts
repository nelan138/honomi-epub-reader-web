import { deleteCategory, renameCategory, updateCategoryState, shiftCategoryDisplayOrder } from "../../../database/category-repository.ts";
import renderBookshelf from "../features/render-bookshelf.ts";
import openFormFor from "../features/open-forms.ts";


export default function bindCategoryEvents() {
   const bookshelf = document.getElementById('bookshelf')!;

   bookshelf.addEventListener("click", async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickedButton = target.closest('.category button') as HTMLButtonElement;
      if (!clickedButton) return;

      const clickedCategory = clickedButton.closest('.category')! as HTMLElement;
      const categoryId = Number(clickedCategory.getAttribute('data-category-id'));
      
      if (clickedButton.matches('.expand-category-btn') || clickedButton.matches('.collapse-category-btn')) {
         const isExpanded = clickedCategory.classList.contains('expanded');
         await updateCategoryState(categoryId, !isExpanded);
         await renderBookshelf();
      }

      else if (clickedButton.matches('.rename-category-btn')) {
         const newCategoryName = await openFormFor('category-name') as string;
         const clickedCategoryName = clickedCategory.getAttribute('data-category-name')!;

         if (newCategoryName && newCategoryName !== clickedCategoryName) {
            await renameCategory(categoryId, newCategoryName);
            await renderBookshelf();
         }
      }

      else if (clickedButton.matches('.delete-category-btn')) {
         const confirmation = await openFormFor('confirmation') as boolean;
         if (confirmation) {
            await deleteCategory(categoryId);
            await renderBookshelf();
         }
      }

      else if (clickedButton.matches('.move-category-up-btn') && !clickedButton.hidden) {
         await shiftCategoryDisplayOrder(categoryId, -1);
         await renderBookshelf();
      }

      else if (clickedButton.matches('.move-category-down-btn') && !clickedButton.hidden) {
         await shiftCategoryDisplayOrder(categoryId, 1);
         await renderBookshelf();
      }
   });
}


