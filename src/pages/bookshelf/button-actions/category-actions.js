import { addCategory, deleteCategory, getCategory, renameCategory, updateCategoryState } from "../../../database/database.js";
import { CategoryRecord } from "../../../database/schema.js";
import renderBookshelf from "../features/render-bookshelf.js";
import openFormFor from "../overlays/forms.js";

export default function initCategoryActions() {
   const bookshelf = document.getElementById('bookshelf');

   const addCategoryBtn = document.getElementById("add-category-btn");
   addCategoryBtn.addEventListener(("click"), async () => {
      const name = await openFormFor("category-name");
      if (name) {
         const record = new CategoryRecord(name);
         await addCategory(record);
         await renderBookshelf();
      }
   })

   const categories = bookshelf.querySelectorAll('.category');

   categories.forEach(category => {
      const toggleBtn = category.querySelector('.toggle-category-btn');

      toggleBtn.addEventListener(("click"), async () => {
         const categoryRecord = await getCategory(category.getAttribute("data-category-name"));
         await updateCategoryState(Number(categoryRecord.id), !categoryRecord.expanded);
         await renderBookshelf();
      })

      if (category.getAttribute("data-category-name") === "Your Books") return;

      const renameBtn = category.querySelector('.rename-category-btn');
      const deleteBtn = category.querySelector('.delete-category-btn');

      renameBtn.addEventListener(("click"), async () => {
         const name = await openFormFor("category-name");
         if (name) {
            await renameCategory(category.getAttribute("data-category-name"), name);
            await renderBookshelf();
         }
      });

      deleteBtn.addEventListener(("click"), async () => {
         if (await openFormFor("confirmation")) {
            await deleteCategory(category.getAttribute("data-category-name"));
            await renderBookshelf();
         }
      })

   })
}


