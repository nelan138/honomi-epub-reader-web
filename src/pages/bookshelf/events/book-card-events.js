import { renameBook, deleteBook, changeBookCategory } from "../../../database/book-repository.js";
import renderBookshelf from "../features/render-bookshelf.js";
import openFormFor from "../features/open-forms.js";

export default function bindBookCardEvents() {
   const bookCards = document.querySelectorAll('.book-card');
   bookCards.forEach(card => {
      const bookId = Number(card.getAttribute("data-book-id"));

      const renameButton = card.querySelector(".rename-book-btn");
      const changeBookCategoryButton = card.querySelector(".change-book-category-btn");
      const deleteButton = card.querySelector(".delete-book-btn");

      renameButton.addEventListener("click", async () => {
         const title = await openFormFor("book-name");
         console.log("New book title:", title);
         if (title) {
            await renameBook(bookId, title);
            await renderBookshelf();
         }
      });

      changeBookCategoryButton.addEventListener(("click"), async () => {
         const selectedCategory = await openFormFor("category-selection");
         if (selectedCategory) {
            await changeBookCategory(bookId, selectedCategory)
            await renderBookshelf();
         }
      })

      deleteButton.addEventListener("click", async () => {
         if (await openFormFor("confirmation")) {
            await deleteBook(bookId);
            await renderBookshelf();
         }
      });
   });
}