<script setup lang="ts">
import Shelf from '@src/components/library/Shelf.vue';
import LibraryHeader from '@src/components/library/LibraryHeader.vue';
import BookCard from '@src/components/library/BookCard.vue';

import { useShelves } from '@src/composables/library/useShelves';
import { useTheme } from '@src/composables/library/useTheme';
import { useBooks } from '@src/composables/library/useBooks';
import { useReader } from '@src/composables/reader/useReader';

const { toggleTheme } = useTheme();
const { shelves, addShelf, deleteShelf, renameShelf, collapseShelf, expandShelf, moveShelfUp, moveShelfDown } =
   useShelves();
const { books, renameBook, changeBookShelf, deleteBook, importBooks } = useBooks();

const { openBook } = useReader()


const getBooksInShelf = (shelfId: number) => books.value.filter((book) => book.shelfId === shelfId);
</script>

<template>
   <LibraryHeader @toggle-theme="toggleTheme" @add-shelf="addShelf" @import-files="importBooks" />

   <template v-for="shelf in shelves" :key="shelf.id">
      <Shelf
         @rename="renameShelf($event)"
         @move-up="moveShelfUp($event)"
         @move-down="moveShelfDown($event)"
         @expand="expandShelf($event)"
         @collapse="collapseShelf($event)"
         @delete="deleteShelf($event)"
         :shelf="shelf"
      >
         <template #books v-if="shelf.expanded">
            <TransitionGroup
               tag="div"
               name="book-list"
               class="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4"
            >
               <template v-for="book in getBooksInShelf(shelf.id)" :key="book.id">
                  <BookCard
                     @open="openBook($event)"
                     @rename="renameBook($event)"
                     @delete="deleteBook($event)"
                     @change-shelf="changeBookShelf($event)"
                     :book="book"
                  />
               </template>
            </TransitionGroup>
         </template>
      </Shelf>
   </template>
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
