import { renameBook, deleteBook, changeBookCategory } from "../../../database/book-repository.js";
import renderBookshelf from "../features/render-bookshelf.js";
import openFormFor from "../features/open-forms.js";

export default function bindBookCardEvents() {
   const bookshelf = document.getElementById("bookshelf");
   bookshelf.addEventListener("click", async (event) => {
      const clickedButton = event.target.closest(".book-card button");
      if (!clickedButton) return;

      const clickedBookCard = clickedButton.closest(".book-card");
      const bookId = Number(clickedBookCard.getAttribute("data-book-id"));

      if (clickedButton.matches(".rename-book-btn")) {
         const title = await openFormFor("book-name");
         if (title) await renameBook(bookId, title);
      }

      else if (clickedButton.matches(".change-book-category-btn")) {
         const selectedCategory = await openFormFor("category-selection");
         if (selectedCategory) await changeBookCategory(bookId, selectedCategory)
      }

      else if (clickedButton.matches(".delete-book-btn")) {
         if (await openFormFor("confirmation")) await deleteBook(bookId);
      }

      await renderBookshelf();
   });
}