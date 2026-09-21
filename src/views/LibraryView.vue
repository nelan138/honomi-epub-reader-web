<script setup lang="ts">
import { tryCatch } from '@src/utils';
import { useShelfStore } from '@src/stores/useShelfStore';
import { useBookStore } from '@src/stores/useBookStore';
import { useThemeStore } from '@src/stores/useThemeStore';
import { useToast } from '@src/composables/useToast';
import { usePrompt } from '@src/composables/usePrompt';
import { useAlert } from '@src/composables/useAlert';
import { useSelect } from '@src/composables/useSelect';

/* *** */

const themeStore = useThemeStore();
const bookStore = useBookStore();
const shelfStore = useShelfStore();

onMounted(() => {
   themeStore.load();
   bookStore.load();
   shelfStore.load();
});

onUnmounted(() => {
   themeStore.reset();
   bookStore.reset();
   shelfStore.reset();
});

// Portals

const { toast } = useToast();

const { prompt } = usePrompt();
const { alert } = useAlert();
const { select } = useSelect();

/* BOOK SECTION */

const handleImportingBooks = async (files: FileList) => {
   for (const file of files) {
      const [_, error] = await tryCatch(bookStore.addBook(file));
      if (error) {
         toast.error(`Failed to add ${file.name}`, error.message, { duration: 5000 });
         continue;
      }
   }
};

const handleChangingBookShelf = async (bookId: number) => {
   const selection = await select(shelfSelections.value, {
      title: 'Choose one',
      description: 'Select which shelf you want to move this item into.',
   });

   if (!selection) return;

   if (selection === null) {
      toast.error('Warning', 'Shelf cannot be null');
      return;
   }

   const shelfId = typeof selection.id === 'number' ? selection.id : Number(selection.id);

   const [_, error] = await tryCatch(bookStore.changeBookShelf(bookId, shelfId));
   if (error) {
      toast.error(error.name, error.message);
   }
};

const handleRenamingBook = async (bookId: number) => {
   const input =
      (
         await prompt({
            title: 'Rename Book',
            description: 'Enter a new name for this book.',
            placeholder: 'Book title...',
         })
      )?.trim() ?? null;

   if (input === null) return;

   if (input === '') {
      toast.error('Warning', 'Name cannot be empty');
      return;
   }

   const [_, error] = await tryCatch(bookStore.renameBook(bookId, input));
   if (error) {
      toast.error(error.name, error.message);
   }
};

const handleDeletingBook = async (bookId: number) => {
   const confirmed = await alert({
      title: 'Delete Book',
      description: 'Are you sure you want to remove this book? Its progress and cached data will be deleted.',
      confirmText: 'Delete',
      cancelText: 'Keep',
   });

   if (!confirmed) return;

   const [_, error] = await tryCatch(bookStore.deleteBook(bookId));
   if (error) {
      toast.error(error.name, error.message);
   }
};

/* SHELF SECTION */

const shelfSelections = computed(() =>
   shelfStore.shelves.map((shelf) => ({
      id: shelf.id,
      value: shelf.name,
   }))
);

const bookShelfMap = computed(() => Map.groupBy(bookStore.books, (book) => book.shelfId));

const handleAddingShelf = async () => {
   const input =
      (
         await prompt({
            title: 'New Shelf',
            description: 'Enter a name for the new shelf.',
            placeholder: 'e.g. Science Fiction, To Read...',
         })
      )?.trim() ?? null;

   if (input === null) return;

   if (input === '') {
      toast.error('Warning', 'Name cannot be empty', { duration: 5000 });
      return;
   }

   const [_, error] = await tryCatch(shelfStore.addShelf(input));
   if (error) {
      toast.error(error.name, error.message);
   }
};

const handleRenamingShelf = async (shelfId: number) => {
   const input =
      (
         await prompt({
            title: 'Rename Shelf',
            description: 'Enter a new name for this shelf.',
            placeholder: 'Shelf name...',
         })
      )?.trim() ?? null;

   if (input === null) {
      toast.error('Warning', 'Shelf name cannot be null', { duration: 5000 });
      return;
   }

   if (input === '') {
      toast.error('Warning', 'Shelf name cannot be empty', { duration: 5000 });
      return;
   }

   const [_, error] = await tryCatch(shelfStore.renameShelf(shelfId, input));
   if (error) {
      toast.error(error.name, error.message, { duration: 5000 });
   }
};

const handleDeletingShelf = async (shelfId: number) => {
   const confirmed = await alert({
      title: 'Delete Shelf',
      description: 'Are you sure you want to delete this shelf and all the books exist inside it?',
      confirmText: 'Delete Shelf',
      cancelText: 'Cancel',
   });

   if (!confirmed) return;

   const [_, error] = await tryCatch(shelfStore.deleteShelf(shelfId));
   if (error) {
      toast.error(error.name, error.message);
   }
};

const router = useRouter();
</script>

<template>
   <LibraryHeader
      @toggle-theme="themeStore.toggleTheme"
      @add-shelf="handleAddingShelf"
      @import-files="handleImportingBooks"
   />

   <div>test, if this is working</div>

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
