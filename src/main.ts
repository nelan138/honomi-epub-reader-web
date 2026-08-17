import openDatabase from "./database/database.js";
import { addCategory } from "./database/category-repository.js";
import { getUserPreferences } from "./database/user-preference-repository.js";

import bindBookshelfHeaderEvents from "./pages/bookshelf/events/bookshelf-header-events.js";
import bindBookImportEvents from "./pages/bookshelf/features/import-books.js";
import bindCategoryEvents from "./pages/bookshelf/events/category-events.js";
import bindBookCardEvents from "./pages/bookshelf/events/book-card-events.js";

import renderBookshelf from "./pages/bookshelf/features/render-bookshelf.js";
import { type CategoryRecord, defaultCategoryName } from "./database/schema.js";

await openDatabase();
const defaultCategory: CategoryRecord = {
   name: defaultCategoryName,
   expanded: true
};
addCategory(defaultCategory);

await renderBookshelf();

const userPreferences = await getUserPreferences();
document.documentElement.setAttribute('data-theme', userPreferences.theme);
bindBookshelfHeaderEvents();

bindCategoryEvents();
bindBookCardEvents();
bindBookImportEvents();


