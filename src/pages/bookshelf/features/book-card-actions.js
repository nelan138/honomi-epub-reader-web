import { renameBook, deleteBook } from "../../../database/database.js";
import renderBookshelf from "./render-bookshelf.js";

export default function initBookCardActions() {
   const bookCards = document.querySelectorAll('.book-card');
   bookCards.forEach(card => {
      const bookId = Number(card.getAttribute("data-book-id"));

      const renameButton = card.querySelector(".rename-book-btn");
      const deleteButton = card.querySelector(".delete-book-btn");

      renameButton.addEventListener("click", async() => {
         const title = askUserForNewBookTitle();

         if (title) {
            await renameBook(bookId, title);
            await renderBookshelf();
         }
      });

      deleteButton.addEventListener("click", async () => {
         if (askForUserConfirmation()) {
            await deleteBook(bookId);
            await renderBookshelf();
         }
      });
   });
}

// TODO
function askUserForNewBookTitle() {
   return prompt("Rename to: ", "New Title");
}

// TODO
function askForUserConfirmation() {
   return confirm("Do you want to delete this book?");
}

// TODO
function askUserForNewBookCategoryLocation() {
   return prompt("Move book to: ", "Your Books");
}

