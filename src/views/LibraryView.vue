<template>
   <Header>
      <div class="flex gap-6">
         <label class="cursor-pointer">
            <i class="fa-solid fa-upload scale-[110%]"></i>
            <input
               @change="
                  (event) => {
                     const target = event.target as HTMLInputElement;
                     if (target.files) handleImportingBooks(target.files);
                  }
               "
               class="hidden"
               type="file"
               accept=".epub,application/epub+zip"
               multiple
            />
         </label>

         <a
            href="https://github.com/nelan138/honomi-epub-reader-web"
            target="_blank"
            rel="noopener noreferrer"
            class=""
         >
            <i class="fa-brands fa-github scale-[110%]"></i>
         </a>
      </div>

      <div class="flex gap-6">
         <button @click="handleAddingShelf" type="button" class="hover:cursor-pointer">
            <i class="fa-solid fa-folder-plus scale-[110%]"></i>
         </button>

         <button @click="themeStore.toggleTheme" type="button" class="hover:cursor-pointer">
            <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
         </button>
      </div>
   </Header>

   <BookShelf v-for="shelf in shelfStore.shelves" :key="shelf.id">
      <template #label>
         <h2 class="font-sans font-medium tracking-widest uppercase">
            {{ shelf.name }}
         </h2>
      </template>

      <template #actions>
         <div class="flex gap-4 text-[80%] lg:gap-6">
            <template v-if="shelf.name !== defaultShelf.name">
               <button @click="shelfStore.moveShelfUp(shelf.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-circle-up"></i>
               </button>

               <button @click="shelfStore.moveShelfDown(shelf.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-circle-down"></i>
               </button>

               <button @click="handleRenamingShelf(shelf.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-pencil"></i>
               </button>

               <button @click="handleDeletingShelf(shelf.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-x"></i>
               </button>
            </template>

            <button
               type="button"
               @click="shelf.expanded ? shelfStore.collapseShelf(shelf.id) : shelfStore.expandShelf(shelf.id)"
               class="hover:cursor-pointer"
            >
               <i v-if="shelf.expanded" class="fa-solid fa-caret-down"></i>
               <i v-else class="fa-solid fa-caret-right"></i>
            </button>
         </div>
      </template>

      <template #books v-if="shelf.expanded">
         <BookCard
            v-for="book in bookShelfMap.get(shelf.id) ?? []"
            :key="book.id"
            @click="router.push(`reader/${book.id}`)"
         >
            <template #image>
               <Image :ratio="2 / 3" :alt="book.metadata.title" :src="blobToUrl(book.cover)" />
            </template>

            <template #metadata>
               <h3 class="line-clamp-2 font-sans font-medium break-all">{{ book.metadata.title }}</h3>
               <p class="truncate text-[80%]">{{ book.metadata.creator }}</p>
               <p class="truncate text-[80%]">{{ book.metadata.publisher }}</p>
               <p class="truncate text-[80%]">{{ book.metadata.language }}</p>
            </template>

            <template #progress-bar>
               <ProgressBar :value="(book.charactersRead * 100) / book.totalCharacters" />
            </template>

            <template #actions>
               <button @click="handleRenamingBook(book.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-pen-to-square"></i>
               </button>

               <button @click="handleChangingBookShelf(book.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-right-left"></i>
               </button>

               <button @click="handleDeletingBook(book.id)" type="button" class="hover:cursor-pointer">
                  <i class="fa-solid fa-trash"></i>
               </button>
            </template>
         </BookCard>
      </template>
   </BookShelf>
</template>

<script setup lang="ts">
import { tryCatch } from '@src/utils';
import { useShelfStore } from '@src/stores/useShelfStore';
import { useBookStore } from '@src/stores/useBookStore';
import { useThemeStore } from '@src/stores/useThemeStore';
import { useToast } from '@src/composables/useToast';
import { usePrompt } from '@src/composables/usePrompt';
import { useAlert } from '@src/composables/useAlert';
import { useSelect } from '@src/composables/useSelect';
import { defaultShelf } from '@src/services/dexie/database';

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

   if (input === null) return;

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
const blobToUrl = (blob: Blob) => URL.createObjectURL(blob);
</script>
