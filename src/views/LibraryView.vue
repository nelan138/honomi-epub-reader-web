<script setup lang="ts">
import { UnexpectedRuntimeError, unwrapAsync } from '@src/utils';
import { useSelectDialog } from '@src/composables/useSelectDialog';
import { useInputDialog } from '@src/composables/useInputDialog';
import { useConfirmDialog } from '@src/composables/useConfirmDialog';
import { useShelfStore } from '@src/stores/useShelfStore';
import { useBookStore, type BookCard } from '@src/stores/useBookStore';
import { useThemeStore } from '@src/stores/useThemeStore';
import { useToast } from '@src/composables/useToast';

/* *** */

onMounted(() => {
   themeStore.load();
   shelfStore.load();
   bookStore.load();
});

onUnmounted(() => {
   bookStore.reset();
   shelfStore.reset();
   themeStore.reset();
});

const router = useRouter();

// STORES
const themeStore = useThemeStore();
const bookStore = useBookStore();
const shelfStore = useShelfStore();

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

const { toast } = useToast();

const handleImportingBooks = async (files: FileList) => {
   await bookStore.importBooks(files);
   toast.success('Whatever', `Imported ${files.length} books`, { duration: 1000 });
};
</script>

<template>
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

      <InputDialog
         @submit="resolveInputDialogSubmit"
         @cancel="resolveInputDialogCancel"
         v-model:open="textDialogIsOpen"
      />
   </template>

   <Toaster />

   <LibraryHeader
      @toggle-theme="themeStore.toggleTheme"
      @add-shelf="handleAddingShelf"
      @import-files="handleImportingBooks"
   />

   <BookShelf
      v-for="shelf in shelfStore.shelves"
      :key="shelf.id"
      :shelf="shelf"
      @rename="handleRenamingShelf"
      @delete="handleDeletingShelf"
      @move-up="shelfStore.moveShelfUp"
      @move-down="shelfStore.moveShelfDown"
      @expand="shelfStore.expandShelf"
      @collapse="shelfStore.collapseShelf"
   >
      <TransitionGroup
         v-if="shelf.expanded"
         tag="div"
         name="book-list"
         class="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4"
      >
         <BookCard
            v-for="book in bookShelfMap.get(shelf.id) ?? []"
            :key="book.id"
            :book="book"
            @open="router.push(`/reader/${book.id}`)"
            @rename="handleRenamingBook"
            @delete="handleDeletingBook"
            @change-shelf="handleChangingBookShelf"
         />
      </TransitionGroup>
   </BookShelf>
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
