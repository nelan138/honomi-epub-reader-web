<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Category from './components/Category.vue';
import Header from './components/Header.vue';
import BookCard from './components/BookCard.vue';
import {
   addCategoryToDB,
   renameCategoryInDB,
   changeCategoryStateInDB,
   getCategoriesFromDB,
   deleteCategoryFromDB,
} from '@src/services/database/categoryRepo';
import type { CategoryRecord } from '@src/types/category';
import type { BookRecord } from '@src/types/book';
import {
   addBookToDB,
   changeBookCategoryInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/database/bookRepo';
import { EpubBook } from './services/epub/epub.js';
import { defaultCategory } from './constants/database.js';

type Theme = 'dark' | 'light';
type CategoryWithBooks = CategoryRecord & {
   books: BookRecord[];
};

const books = ref<BookRecord[]>([]);
const categories = ref<CategoryRecord[]>([]);
const theme = ref<Theme>('dark');

const categoriesWithBooks = computed<CategoryWithBooks[]>(() => {
   return categories.value.map((category) => ({
      ...category,
      books: books.value.filter((book) => book.categoryId === category.id),
   }));
});

async function updateBooks() {
   books.value = await getBooksFromDB();
}

async function updateCategories() {
   categories.value = await getCategoriesFromDB();
}

onMounted(async () => {
   let savedTheme = localStorage.getItem('theme') as Theme;
   savedTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';

   theme.value = savedTheme;
   applyTheme(theme.value);

   categories.value = await getCategoriesFromDB();
   books.value = await getBooksFromDB();
});

function applyTheme(currentTheme: Theme) {
   localStorage.setItem('theme', currentTheme);
   document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

function toggleTheme() {
   theme.value = theme.value === 'dark' ? 'light' : 'dark';
   applyTheme(theme.value);
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
      await addBookToDB(record);
   }
   await updateBooks();
}

function categoryNameExists(name: string, ignoredId?: number): boolean {
   const normalizedName = name.trim().toLocaleLowerCase();

   return categories.value.some(
      (category) => category.id !== ignoredId && category.name.trim().toLocaleLowerCase() === normalizedName
   );
}

async function handleBookCardEvents(event: string, id: number) {
   switch (event) {
      case 'rename': {
         const name = prompt('Enter new name', 'idk')?.trim();
         if (name) {
            await renameBookInDB(id, name);
            books.value = await getBooksFromDB();
         }
         break;
      }
      case 'delete': {
         if (confirm('Are you sure you want to delete this book?')) {
            await deleteBookFromDB(id);
            books.value = await getBooksFromDB();
         }
         break;
      }
      case 'change-category': {
         const name = prompt('Enter category name')?.trim();
         if (!name) break;

         const category = categories.value.find((category) => category.name === name);
         if (!category) {
            alert(`Category "${name}" does not exist.`);
            break;
         }

         await changeBookCategoryInDB(id, category.id);
         await updateBooks();
         break;
      }
      default:
         throw new Error('Feature not implemented yet');
   }
}

async function addNewCategory() {
   const name = prompt('Enter category name')?.trim();

   if (!name) return;

   if (categoryNameExists(name)) {
      alert('A category with that name already exists.');
      return;
   }

   await addCategoryToDB(name);
   await updateCategories();
}

async function handleCategoryEvents(event: string, id: number) {
   switch (event) {
      case 'rename': {
         const name = prompt('Enter new category name')?.trim();
         if (!name) break;

         if (categoryNameExists(name, id)) {
            alert('A category with that name already exists.');
            break;
         }

         await renameCategoryInDB(id, name);
         await updateCategories();
         break;
      }
      case 'delete': {
         if (confirm('Are you sure you want to delete this categories and all of its content?')) {
            await deleteCategoryFromDB(id);
            await updateCategories();
         }
         break;
      }
      case 'collapse': {
         await changeCategoryStateInDB(id, false);
         await updateCategories();
         break;
      }
      case 'expand': {
         await changeCategoryStateInDB(id, true);
         await updateCategories();
         break;
      }
      default:
         throw new Error('Feature not implemented yet >.<');
   }
}
</script>

<template>
   <!-- Bookshelf -->
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal md:text-xl lg:text-base"
   >
      <Header @toggle-theme="toggleTheme" @add-category="addNewCategory" @import-files="importEpubFiles" />

      <Category
         @rename="(categoryId) => handleCategoryEvents('rename', categoryId)"
         @delete="(categoryId) => handleCategoryEvents('delete', categoryId)"
         @expand="(categoryId) => handleCategoryEvents('expand', categoryId)"
         @collapse="(categoryId) => handleCategoryEvents('collapse', categoryId)"
         v-for="{ books, ...category } in categoriesWithBooks"
         :category="category"
         :key="category.id"
      >
         <template v-if="category.expanded">
            <BookCard
               @rename="(bookId) => handleBookCardEvents('rename', bookId)"
               @delete="(bookId) => handleBookCardEvents('delete', bookId)"
               @change-category="(bookId) => handleBookCardEvents('change-category', bookId)"
               v-for="book in books"
               :book="book"
               :key="book.id"
            />
         </template>
      </Category>
   </div>
</template>
