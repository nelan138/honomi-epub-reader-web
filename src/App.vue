<script setup lang="ts">
import { computed } from 'vue';
import Category from './components/Category.vue';
import Header from './components/Header.vue';
import BookCard from './components/BookCard.vue';
import type { CategoryRecord } from '@src/types/category';
import type { BookRecord } from '@src/types/book';
import useCategories from './composables/useCategories.js';

import { EpubBook } from './services/epub/epub.js';
import { defaultCategory } from '@src/services/database/db';
import useTheme from './composables/useTheme.js';
import useBooks from './composables/useBooks.js';

const { categories, addCategory, deleteCategory, renameCategory, collapseCategory, expandCategory } = useCategories();

type CategoryWithBooks = CategoryRecord & { books: BookRecord[] };
const categoriesWithBooks = computed<CategoryWithBooks[]>(() => {
   return categories.value.map((category) => ({
      ...category,
      books: books.value.filter((book) => book.categoryId === category.id),
   }));
});

async function addNewCategory() {
   const name = prompt('Enter new category name')?.trim();
   if (!name) return;
   await addCategory({ name, expanded: true });
}

async function handleCategoryEvents(event: string, categoryId: number): Promise<void> {
   switch (event) {
      case 'rename': {
         const newName = prompt('Enter new category name')?.trim();
         if (!newName) break;
         return renameCategory(categoryId, newName);
      }
      case 'delete': {
         if (confirm('Are you sure you want to delete this category?')) {
            return deleteCategory(categoryId);
         }
         break;
      }
      case 'collapse': {
         return collapseCategory(categoryId);
      }
      case 'expand': {
         return expandCategory(categoryId);
      }
      default:
         throw new Error('Feature not implemented yet >.<');
   }
}

const { books, renameBook, changeBookCategory, deleteBook, addBook } = useBooks();
async function handleImportingFiles(files: FileList) {
   for (const file of files) {
      if (!file) continue;
      const epubBook = new EpubBook(file);
      await epubBook.parse();

      await addBook({
         categoryId: defaultCategory.id,
         progress: 0,
         epubFile: epubBook.getEpubFile(),
         version: epubBook.getVersion(),
         opfPath: epubBook.getOpfPath(),
         manifest: epubBook.getManifest(),
         navigation: epubBook.getNavigation(),
         spine: epubBook.getSpine(),
         metadata: epubBook.getMetadata(),
         cover: epubBook.getCover(),
      });
   }
}
async function handleBookCardEvents(event: string, bookId: number): Promise<void> {
   switch (event) {
      case 'rename': {
         const newTitle = prompt('Enter new book title')?.trim();
         if (!newTitle) break;
         return renameBook(bookId, newTitle);
      }
      case 'change-category': {
         const categoryName = prompt('Enter the new category name')?.trim();
         if (!categoryName) break;

         const targetCategory = categories.value.find(
            (category) => category.name.trim().toLocaleLowerCase() === categoryName.toLocaleLowerCase()
         );

         if (!targetCategory) {
            alert('Category does not exist!');
            break;
         }

         return changeBookCategory(bookId, targetCategory.id);
      }
      case 'delete': {
         if (confirm('Are you sure you want to delete this book?')) {
            return deleteBook(bookId);
         }
         break;
      }

      default:
         throw new Error('Feature not implemented yet >.<');
   }
}
const { toggleTheme } = useTheme();
</script>

<template>
   <!-- Bookshelf -->
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal md:text-xl lg:text-base"
   >
      <Header @toggle-theme="toggleTheme" @add-category="addNewCategory" @import-files="handleImportingFiles" />

      <Category
         @rename="() => handleCategoryEvents('rename', category.id)"
         @delete="() => handleCategoryEvents('delete', category.id)"
         @expand="() => handleCategoryEvents('expand', category.id)"
         @collapse="() => handleCategoryEvents('collapse', category.id)"
         v-for="{ books, ...category } in categoriesWithBooks"
         :category="category"
         :key="category.id"
      >
         <template v-if="category.expanded">
            <BookCard
               @rename="(id) => handleBookCardEvents('rename', id)"
               @delete="(id) => handleBookCardEvents('delete', id)"
               @change-category="(id) => handleBookCardEvents('change-category', id)"
               v-for="book in books"
               :book="book"
               :key="book.id"
            />
         </template>
      </Category>
   </div>
</template>
