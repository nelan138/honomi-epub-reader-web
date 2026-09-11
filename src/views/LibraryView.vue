<script setup lang="ts">
import Shelf from '@src/components/library/Shelf.vue';
import LibraryHeader from '@src/components/library/LibraryHeader.vue';
import BookCard from '@src/components/library/BookCard.vue';

import { useShelves } from '@src/composables/library/useShelves';
import { useTheme } from '@src/composables/library/useTheme';
import { useBooks } from '@src/composables/library/useBooks';
import { useReader } from '@src/composables/reader/useReader';
import { computed } from 'vue';
import type { BookCard as BookCardType } from '@src/types/book';
import TextDialog from '@src/components/library/TextDialog.vue';
import { unwrapAsync } from '@src/utilities';
import { EmptyStringError, UnexpectedRuntimeError } from '@src/types/errors';
import { useTextModal } from '@src/composables/library/useTextModal';

const { toggleTheme } = useTheme();

const { shelves, addShelf, deleteShelf, renameShelf, collapseShelf, expandShelf, moveShelfUp, moveShelfDown } =
   useShelves();

const { openBook } = useReader();
const { books, renameBook, changeBookShelf, deleteBook, importBooks } = useBooks();

const bookShelfMap = computed(() => {
   const map = new Map<number, BookCardType[]>();

   for (const book of books.value) {
      const list = map.get(book.shelfId);

      if (list) list.push(book);
      else map.set(book.shelfId, [book]);
   }

   return map;
});

const { textDialogIsOpen, textDialogPrompt, handleTextDialogCancel, handleTextDialogSubmit } = useTextModal();

const handleAddingShelf = async () => {
   const [name, error] = await unwrapAsync(textDialogPrompt());
   if (error) {
      if (error instanceof EmptyStringError) return alert(error.message);
      else throw new UnexpectedRuntimeError(error.message);
   }
   if (name) addShelf(name);
};

const handleRenamingShelf = async (shelfId: number) => {
   const [name, error] = await unwrapAsync(textDialogPrompt());
   if (error) {
      if (error instanceof EmptyStringError) return alert(error.message);
      else throw new UnexpectedRuntimeError(error.message);
   }
   if (name) renameShelf(shelfId, name);
};

const handleRenamingBook = async (bookId: number) => {
   const [name, error] = await unwrapAsync(textDialogPrompt());
   if (error) {
      if (error instanceof EmptyStringError) return alert(error.message);
      else throw new UnexpectedRuntimeError(error.message);
   }
   if (name) renameBook(bookId, name);
};
</script>

<template>
   <TextDialog @submit="handleTextDialogSubmit" @cancel="handleTextDialogCancel" v-model:open="textDialogIsOpen">
   </TextDialog>

   <main>
      <LibraryHeader @toggle-theme="toggleTheme" @add-shelf="handleAddingShelf" @import-files="importBooks" />

      <ul>
         <li v-for="shelf in shelves" :key="shelf.id">
            <Shelf
               @rename="handleRenamingShelf"
               @move-up="moveShelfUp"
               @move-down="moveShelfDown"
               @expand="expandShelf"
               @collapse="collapseShelf"
               @delete="deleteShelf"
               :shelf="shelf"
            >
               <TransitionGroup tag="div" name="book-list">
                  <ul class="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4" v-if="shelf.expanded">
                     <li v-for="book in bookShelfMap.get(shelf.id) ?? []" :key="book.id">
                        <BookCard
                           @open="openBook"
                           @rename="handleRenamingBook"
                           @delete="deleteBook"
                           @change-shelf="changeBookShelf"
                           :book="book"
                        />
                     </li>
                  </ul>
               </TransitionGroup>
            </Shelf>
         </li>
      </ul>
   </main>
</template>

<style scoped>
.book-list-enter-active,
.book-list-leave-active {
   transition: all 0.25s ease;
}

.book-list-enter-from,
.book-list-leave-to {
   opacity: 0;
   transform: translateY(8px) scale(0.96);
}

.book-list-move {
   transition: transform 0.25s ease;
}
</style>
