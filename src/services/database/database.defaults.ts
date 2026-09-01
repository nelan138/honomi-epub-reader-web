import type { CategoryRecord } from './categories/category.types.ts';

export const DB_NAME = 'Honomi';
export const DB_VERSION = 1;

export const STORES = {
   BOOKS: 'books',
   CATEGORIES: 'categories',
};

export const defaultCategory: CategoryRecord = {
   id: 1,
   displayOrder: 0,
   name: 'Your Library',
   expanded: true,
};
