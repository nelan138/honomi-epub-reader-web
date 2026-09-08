<script setup lang="ts">
import Shelf from '@src/components/library/Shelf.vue';
import Header from '@src/components/library/Header.vue';
import BookCard from '@src/components/library/BookCard.vue';

import { useShelves } from '@src/composables/library/useShelves';
import { useTheme } from '@src/composables/library/useTheme';
import { useBooks } from '@src/composables/library/useBooks';

const { toggleTheme } = useTheme();
const { shelves, addShelf, deleteShelf, renameShelf, collapseShelf, expandShelf, moveShelfUp, moveShelfDown } =
   useShelves();
const { books, openBook, renameBook, changeBookShelf, deleteBook, importBooks } = useBooks();

const getBooksInShelf = (shelfId: number) => books.value.filter((book) => book.shelfId === shelfId);
</script>

<template>
   <Header @toggle-theme="toggleTheme" @add-shelf="addShelf" @import-files="importBooks" />

   <Shelf
      @rename="renameShelf($event)"
      @move-up="moveShelfUp($event)"
      @move-down="moveShelfDown($event)"
      @expand="expandShelf($event)"
      @collapse="collapseShelf($event)"
      @delete="deleteShelf($event)"
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
            @open="openBook($event)"
            @rename="renameBook($event)"
            @delete="deleteBook($event)"
            @change-shelf="changeBookShelf($event)"
            v-for="book in getBooksInShelf(shelf.id)"
            :book="book"
            :key="book.id"
         />
      </TransitionGroup>
   </Shelf>
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
