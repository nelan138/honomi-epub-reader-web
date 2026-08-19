import { renameBook, deleteBook, changeBookCategory } from "../../../database/book-repository.ts";
import { getCategoryByName } from "../../../database/category-repository.ts";

import renderBookshelf from "../features/render-bookshelf.ts";
import openFormFor from "../features/open-forms.ts";


export default function bindBookCardEvents() {
   const bookshelf = document.getElementById("bookshelf")!;
   bookshelf.addEventListener("click", async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickedButton = target.closest(".book-card button");
      if (!clickedButton) return;

      const clickedBookCard = clickedButton.closest(".book-card")!;
      const bookId = Number(clickedBookCard.getAttribute("data-book-id"));

      if (clickedButton.matches(".rename-book-btn")) {
         const title = await openFormFor("book-name") as string;
         if (title) {
            await renameBook(bookId, title);
         }
      }

      else if (clickedButton.matches(".change-book-category-btn")) {
         const selectedCategory = await openFormFor("category-selection") as string;
         if (selectedCategory) {
            const category = await getCategoryByName(selectedCategory);
            await changeBookCategory(bookId, category.id!);
         }
      }

      else if (clickedButton.matches(".delete-book-btn")) {
         const confirmation = await openFormFor("confirmation") as boolean;
         if (confirmation) {
            await deleteBook(bookId);
         }
      }

      await renderBookshelf();
   });
}