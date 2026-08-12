import { renameBook, deleteBook } from "../../../database/database.js";
import renderBookshelf from "./render-bookshelf.js";

export default function initBookCardActions() {
   const bookCards = document.querySelectorAll('.book-card');
   bookCards.forEach(card => {
      const bookId = Number(card.getAttribute("data-book-id"));

      const renameButton = card.querySelector(".rename-book-btn");
      const deleteButton = card.querySelector(".delete-book-btn");

      renameButton.addEventListener("click", () => {
         const title = askUserForNewBookTitle();

         if (title) {
            renameBook(bookId, title);
            renderBookshelf();
         }
      })

      deleteButton.addEventListener("click", () => {
         if (confirm("Do you want to delete this book?")) {
            deleteBook(bookId);
            renderBookshelf();
         }
      })
   });
}

// ? TODO: ?
function askUserForNewBookTitle() {
   return prompt("Rename to: ", "New Title");
}
