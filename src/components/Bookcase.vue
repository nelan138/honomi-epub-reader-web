<script setup lang="ts">
import Shelf from './Shelf.vue';
import Header from './Header.vue';
import BookCard from './BookCard.vue';

import useShelves from '@src/composables/useShelves';
import useTheme from '@src/composables/useTheme';
import useBooks from '@src/composables/useBooks';
import { EpubBook } from '@src/services/epub/epub';
import type { BookRecord } from '@src/types/book.js';

const { toggleTheme } = useTheme();
const { shelves, addShelf, deleteShelf, renameShelf, collapseShelf, expandShelf, moveShelfUp, moveShelfDown } =
   useShelves();
const { books, renameBook, changeBookShelf, deleteBook, addBook } = useBooks();

async function handleAddingShelf() {
   const name = prompt("Enter new shelf's name")?.trim();
   if (!name) return;
   await addShelf({ name, expanded: true });
}

async function onShelfAction(event: string, shelfId: number): Promise<void> {
   switch (event) {
      case 'rename': {
         const newName = prompt('Enter new shelf name')?.trim();
         if (!newName) break;
         return await renameShelf(shelfId, newName);
      }
      case 'delete': {
         if (confirm('Are you sure you want to delete this shelf?')) {
            return await deleteShelf(shelfId);
         }
         break;
      }
      case 'collapse':
         return await collapseShelf(shelfId);
      case 'expand':
         return await expandShelf(shelfId);
      case 'move-up':
         return await moveShelfUp(shelfId);
      case 'move-down':
         return await moveShelfDown(shelfId);
      default:
         throw new Error('Feature not implemented yet >.<');
   }
}

async function handleImportingFiles(files: FileList) {
   for (const file of files) {
      if (!file) continue;
      const epubBook = new EpubBook(file);
      await epubBook.parse();

      const book: Omit<BookRecord, 'id' | 'shelfId'> = {
         progress: 0,
         epubFile: epubBook.getEpubFile(),
         version: epubBook.getVersion(),
         opfPath: epubBook.getOpfPath(),
         manifest: epubBook.getManifest(),
         navigation: epubBook.getNavigation(),
         spine: epubBook.getSpine(),
         metadata: epubBook.getMetadata(),
         cover: epubBook.getCover(),
      };

      await addBook(book);
   }
}
async function onBookAction(event: string, bookId: number): Promise<void> {
   switch (event) {
      case 'rename': {
         const newTitle = prompt('Enter new book title')?.trim();
         if (!newTitle) break;

         return await renameBook(bookId, newTitle);
      }
      case 'change-shelf': {
         const shelfName = prompt('Enter the new shelf name')?.trim();
         if (!shelfName) break;

         const targetShelf = shelves.value.find(
            (shelf) => shelf.name.trim().toLocaleLowerCase() === shelfName.toLocaleLowerCase()
         );
         if (!targetShelf) {
            alert('Shelf does not exist!');
            break;
         }

         return await changeBookShelf(bookId, targetShelf.id);
      }
      case 'delete': {
         if (confirm('Are you sure you want to delete this book?')) {
            return await deleteBook(bookId);
         }
         break;
      }
      default:
         throw new Error('Feature not implemented yet >.<');
   }
}

const getBooksByShelf = (shelfId: number) => {
   return books.value.filter((book) => book.shelfId === shelfId);
};
</script>

<template>
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal transition-colors md:text-xl lg:text-base"
   >
      <Header @toggle-theme="toggleTheme" @add-shelf="handleAddingShelf" @import-files="handleImportingFiles" />

      <Shelf
         @rename="onShelfAction('rename', $event)"
         @delete="onShelfAction('delete', $event)"
         @expand="onShelfAction('expand', $event)"
         @collapse="onShelfAction('collapse', $event)"
         @move-up="onShelfAction('move-up', $event)"
         @move-down="onShelfAction('move-down', $event)"
         v-for="shelf in shelves"
         :shelf="shelf"
         :key="shelf.id"
      >
         <TransitionGroup
            v-if="shelf.expanded"
            tag="div"
            name="book-list"
            class="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4"
         >
            <BookCard
               @rename="onBookAction('rename', $event)"
               @delete="onBookAction('delete', $event)"
               @change-shelf="onBookAction('change-shelf', $event)"
               v-for="book in getBooksByShelf(shelf.id)"
               :book="book"
               :key="book.id"
            />
         </TransitionGroup>
      </Shelf>
   </div>
</template>

<style lang="css" scoped>
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
