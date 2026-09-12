<script setup lang="ts">
import Shelf from '@src/components/library/Shelf.vue';
import LibraryHeader from '@src/components/library/LibraryHeader.vue';
import BookCard from '@src/components/library/BookCard.vue';

import { useShelves } from '@src/composables/library/useShelves';
import { useTheme } from '@src/composables/library/useTheme';
import { useBooks } from '@src/composables/library/useBooks';
import { useReader } from '@src/composables/reader/useReader';
import { computed } from 'vue';
import { type BookCard as BookCardType, UnexpectedRuntimeError } from '@src/types';
import { unwrapAsync } from '@src/utilities';

import SelectDialog from '@src/components/library/SelectDialog.vue';
import InputDialog from '@src/components/library/InputDialog.vue';
import { useSelectDialog } from '@src/composables/library/useSelectDialog';
import { useInputDialog } from '@src/composables/library/useInputDialog';
import { useConfirmDialog } from '@src/composables/library/useConfirmDialog';
import ConfirmDialog from '@src/components/library/ConfirmDialog.vue';

/* *** */

const { toggleTheme } = useTheme();

const {
   isOpen: selectionDialogIsOpen,
   dialogPrompt: selectDialogPrompt,
   resolveCancel: resolveSelectDialogCancel,
   resolveSelect: resolveSelectDialogSelect,
} = useSelectDialog();

const {
   isOpen: textDialogIsOpen,
   dialogPrompt: inputDialogPrompt,
   resolveCancel: resolveInputDialogCancel,
   resolveSubmit: resolveInputDialogSubmit,
} = useInputDialog();

/* BOOK SECTION */

const { openBook } = useReader();

const { books, renameBook, changeBookShelf, deleteBook, importBooks } = useBooks();

const {
   isOpen: confirmDialogIsOpen,
   dialogPrompt: confirmDialogPrompt,
   resolveConfirm: resolveConfirmDialogConfirm,
   resolveCancel: resolveConfirmDialogCancel,
} = useConfirmDialog();

const handleChangingBookShelf = async (bookId: number) => {
   const [selectShelfId, error] = await unwrapAsync(selectDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (selectShelfId) changeBookShelf(bookId, selectShelfId);
};

const handleRenamingBook = async (bookId: number) => {
   const [newName, error] = await unwrapAsync(inputDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (newName === '') {
      alert('Name cannot be empty');
      return;
   }
   if (newName) renameBook(bookId, newName);
};

const handleDeletingBook = async (bookId: number) => {
   const [confirm, error] = await unwrapAsync(confirmDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (confirm) deleteBook(bookId);
};

/* SHELF SECTION */

const { shelves, addShelf, deleteShelf, renameShelf, collapseShelf, expandShelf, moveShelfUp, moveShelfDown } =
   useShelves();

const shelfOptions = computed<{ id: number; name: string }[]>(() =>
   shelves.value.map(({ id, name }) => ({ id, name }))
);

const bookShelfMap = computed(() => {
   const map = new Map<number, BookCardType[]>();

   for (const book of books.value) {
      const list = map.get(book.shelfId);

      if (list) list.push(book);
      else map.set(book.shelfId, [book]);
   }

   return map;
});

const handleAddingShelf = async () => {
   const [shelfName, error] = await unwrapAsync(inputDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (shelfName === '') {
      alert('Shelf name cannot be empty');
      return;
   }
   if (shelfName) addShelf(shelfName);
};

const handleRenamingShelf = async (shelfId: number) => {
   const [newName, error] = await unwrapAsync(inputDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (newName === '') {
      alert('Name cannot be empty');
      return;
   }
   if (newName) renameShelf(shelfId, newName);
};

const handleDeletingShelf = async (shelfId: number) => {
   const [confirm, error] = await unwrapAsync(confirmDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (confirm) deleteShelf(shelfId);
};
</script>

<template>
   <ConfirmDialog
      v-model:open="confirmDialogIsOpen"
      @confirm="resolveConfirmDialogConfirm"
      @cancel="resolveConfirmDialogCancel"
   />

   <SelectDialog
      v-model:open="selectionDialogIsOpen"
      :options="shelfOptions"
      @cancel="resolveSelectDialogCancel"
      @select="resolveSelectDialogSelect"
   />

   <InputDialog @submit="resolveInputDialogSubmit" @cancel="resolveInputDialogCancel" v-model:open="textDialogIsOpen" />
   
   <LibraryHeader @toggle-theme="toggleTheme" @add-shelf="handleAddingShelf" @import-files="importBooks" />

   <ul>
      <li v-for="shelf in shelves" :key="shelf.id">
         <Shelf
            @rename="handleRenamingShelf"
            @move-up="moveShelfUp"
            @move-down="moveShelfDown"
            @expand="expandShelf"
            @collapse="collapseShelf"
            @delete="handleDeletingShelf"
            :shelf="shelf"
         >
            <TransitionGroup
               tag="ul"
               name="book-list"
               class="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4"
            >
               <li v-if="shelf.expanded" v-for="book in bookShelfMap.get(shelf.id) ?? []" :key="book.id">
                  <BookCard
                     @open="openBook"
                     @rename="handleRenamingBook"
                     @delete="handleDeletingBook"
                     @change-shelf="handleChangingBookShelf"
                     :book="book"
                  />
               </li>
            </TransitionGroup>
         </Shelf>
      </li>
   </ul>
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
