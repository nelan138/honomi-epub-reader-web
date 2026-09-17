<script setup lang="ts">
import { useReader } from '@src/composables/reader/useReader';
import { UnexpectedRuntimeError, unwrapAsync } from '@src/utils';
import { useSelectDialog } from '@src/composables/library/useSelectDialog';
import { useInputDialog } from '@src/composables/library/useInputDialog';
import { useConfirmDialog } from '@src/composables/library/useConfirmDialog';
import { useShelfStore } from '@src/stores/useShelfStore';
import { useBookStore, type BookCard } from '@src/stores/useBookStore';
import { useThemeStore } from '@src/stores/useThemeStore';

/* *** */

// STORES
const themeStore = useThemeStore();
const bookStore = useBookStore();
const shelfStore = useShelfStore();

onMounted(() => {
   themeStore.load();
   shelfStore.load();
   bookStore.load();
});

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

const {
   isOpen: confirmDialogIsOpen,
   dialogPrompt: confirmDialogPrompt,
   resolveConfirm: resolveConfirmDialogConfirm,
   resolveCancel: resolveConfirmDialogCancel,
} = useConfirmDialog();

/* BOOK SECTION */

const { openBook } = useReader();

const handleChangingBookShelf = async (bookId: number) => {
   const [selectShelfId, error] = await unwrapAsync(selectDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (selectShelfId) bookStore.changeBookShelf(bookId, selectShelfId);
};

const handleRenamingBook = async (bookId: number) => {
   const [newName, error] = await unwrapAsync(inputDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (newName === '') {
      alert('Name cannot be empty');
      return;
   }
   if (newName) bookStore.renameBook(bookId, newName);
};

const handleDeletingBook = async (bookId: number) => {
   const [confirm, error] = await unwrapAsync(confirmDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (confirm) bookStore.deleteBook(bookId);
};

/* SHELF SECTION */

type ShelfOption = { id: number; name: string };
const shelfOptions = computed<ShelfOption[]>(() => shelfStore.shelves.map(({ id, name }) => ({ id, name })));

const bookShelfMap = computed(() => {
   const map = new Map<number, BookCard[]>();

   for (const book of bookStore.books) {
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
   if (shelfName) shelfStore.addShelf(shelfName);
};

const handleRenamingShelf = async (shelfId: number) => {
   const [newName, error] = await unwrapAsync(inputDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (newName === '') {
      alert('Name cannot be empty');
      return;
   }
   if (newName) shelfStore.renameShelf(shelfId, newName);
};

const handleDeletingShelf = async (shelfId: number) => {
   const [confirm, error] = await unwrapAsync(confirmDialogPrompt());
   if (error) throw new UnexpectedRuntimeError(error.message);
   if (confirm) shelfStore.deleteShelf(shelfId);
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

   <LibraryHeader
      @toggle-theme="themeStore.toggleTheme"
      @add-shelf="handleAddingShelf"
      @import-files="bookStore.importBooks"
   />

   <ul>
      <li v-for="shelf in shelfStore.shelves" :key="shelf.id">
         <Shelf
            @rename="handleRenamingShelf"
            @move-up="shelfStore.moveShelfUp"
            @move-down="shelfStore.moveShelfDown"
            @expand="shelfStore.expandShelf"
            @collapse="shelfStore.collapseShelf"
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
