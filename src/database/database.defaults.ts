import type { CategoryRecord } from './categories/category.types..ts';
import type { UserSettingsRecord } from './user-settings/user-setting.types.ts';

export const DB_NAME = 'Honomi';
export const DB_VERSION = 1;

export const STORES = {
   BOOKS: 'books',
   CATEGORIES: 'categories',
   USER_SETTINGS: 'userSettings',
};
export const USER_SETTINGS_KEY = 'userPreferences';

export const defaultUserSettings: UserSettingsRecord = {
   theme: 'light',
   titleSortOrder: 'title-asc',
};

export const defaultCategory: CategoryRecord = {
   id: 1,
   displayOrder: 0,
   name: 'Your Library',
   expanded: true,
};
