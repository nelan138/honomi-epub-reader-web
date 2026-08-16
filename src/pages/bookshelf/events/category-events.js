import { addCategory, deleteCategory, renameCategory, updateCategoryState, shiftCategoryDisplayOrder } from "../../../database/category-repository.js";
import renderBookshelf from "../features/render-bookshelf.js";
import openFormFor from "../features/open-forms.js";

export default function bindCategoryEvents() {
   const bookshelf = document.getElementById('bookshelf');
   bookshelf.addEventListener("click", async (event) => {
      const clickedButton = event.target.closest('.category button');
      if (!clickedButton) return;

      const clickedCategory = clickedButton.closest('.category');
      const clickedCategoryName = clickedCategory.getAttribute('data-category-name');

      if (clickedButton.matches('.expand-category-btn') && !clickedButton.hidden) {
         await updateCategoryState(clickedCategoryName, 0);
      }

      else if (clickedButton.matches('.collapse-category-btn') && !clickedButton.hidden) {
         await updateCategoryState(clickedCategoryName, 1);
      }

      else if (clickedButton.matches('.rename-category-btn')) {
         await renameCategory(clickedCategoryName, await openFormFor('category-name', clickedCategoryName));
      }

      else if (clickedButton.matches('.delete-category-btn')) {
         if (await openFormFor('confirmation')) await deleteCategory(clickedCategoryName);
      }

      else if (clickedButton.matches('.move-category-up-btn') && !clickedButton.hidden) {
         await shiftCategoryDisplayOrder(clickedCategoryName, -1);
      }

      else if (clickedButton.matches('.move-category-down-btn') && !clickedButton.hidden) {
         await shiftCategoryDisplayOrder(clickedCategoryName, 1);
      }

      await renderBookshelf();
   });
}


