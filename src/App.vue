<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Category from './components/bookshelf/Category.vue';
import Header from './components/bookshelf/Header.vue';
import { addCategory, getCategories } from './services/database/categories/category-repository.js';
import type { CategoryRecord } from './services/database/categories/category.types.js';
import type { BookRecord } from './services/database/books/book.types.js';
import { addBook, getBooks } from './services/database/books/book-repository.js';
import BookCard from './components/bookshelf/BookCard.vue';
import { EpubBook } from './services/epub/epub-book.js';
import { defaultCategory } from './services/database/database.defaults.js';

const categories = ref<CategoryRecord[]>([]);
const books = ref<BookRecord[]>([]);

type Theme = 'dark' | 'light';
const theme = ref<Theme>('dark');

onMounted(async () => {
   const savedTheme = (localStorage.getItem('theme') ?? 'dark') as Theme;
   theme.value = savedTheme;
   localStorage.setItem('theme', theme.value);
   document.documentElement.classList.toggle('dark', theme.value === 'dark');

   categories.value = await getCategories();
   books.value = await getBooks();
});

function toggleTheme() {
   theme.value = theme.value === 'dark' ? 'light' : 'dark';
   localStorage.setItem('theme', theme.value);
   document.documentElement.classList.toggle('dark', theme.value === 'dark');
}

type CategoryWithBooks = CategoryRecord & {
   books: BookRecord[];
};

const categoriesWithBooks = computed<CategoryWithBooks[]>(() => {
   return categories.value.map((category) => ({
      ...category,
      books: books.value.filter((book) => book.categoryId === category.id),
   }));
});

async function updateBooks() {
   books.value = await getBooks();
}

async function importEpubFiles(files: FileList) {
   for (const file of files) {
      if (!file) continue;
      const epubBook = new EpubBook(file);
      await epubBook.parse();

      const record: Omit<BookRecord, 'id'> = {
         categoryId: defaultCategory.id,
         progress: 0,
         version: epubBook.getVersion(),
         epubFile: epubBook.getEpubFile(),
         opfPath: epubBook.getOpfPath(),
         manifest: epubBook.getManifest(),
         navigation: epubBook.getNavigation(),
         spine: epubBook.getSpine(),
         metadata: epubBook.getMetadata(),
         cover: epubBook.getCover(),
      };
      addBook(record);
   }

   await updateBooks();
}

async function addNewCategory() {
   const input = prompt('Enter category name', 'idk');

   if (input) {
      const categoryName = input.trim();
      const exists = categories.value.some((c) => c.name === categoryName);

      if (!exists && categoryName !== '') {
         await addCategory(categoryName);
         categories.value = await getCategories();
      }
   }
}
</script>

<template>
   <!-- Bookshelf -->
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal md:text-xl lg:text-base"
   >
      <Header @toggle-theme="toggleTheme" @add-category="addNewCategory" @import-files="importEpubFiles" />
      <Category v-for="{ books, ...category } in categoriesWithBooks" :category="category" :key="category.id">
         <BookCard v-for="book in books" :book="book" :key="book.id" />
      </Category>
   </div>
</template>
