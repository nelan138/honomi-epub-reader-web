import { getCategory, renameCategory, updateCategoryState } from "../../../database/database.js";
import renderBookshelf from "./render-bookshelf.js";

export default function initCategoryActions() {
   const bookshelf = document.getElementById('bookshelf');
   const categories = bookshelf.querySelectorAll('.category');

   categories.forEach(category => {
      const renameBtn = category.querySelector('.rename-category-btn');
      const toggleBtn = category.querySelector('.toggle-category-btn');
      const deleteBtn = category.querySelector('.delete-category-btn');

      renameBtn.addEventListener(("click"), async () => {
         const name = askUserForNewCategoryName();
         if (name) {
            await renameCategory(category.id, name);
            await renderBookshelf();
         }
      });

      toggleBtn.addEventListener(("click"), async () => {
         const categoryRecord = await getCategory(category.getAttribute("data-category-name"));
         await updateCategoryState(Number(categoryRecord.id), !categoryRecord.expanded);
         await renderBookshelf();
      })
   })
}

function askUserForNewCategoryName() {
   return prompt("Rename to: ", "New Name");
}

function askUserForNewBookCategoryLocation() {
   // TODO
}

