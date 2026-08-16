import openDatabase from "./database/database.js";
import { addCategory } from "./database/category-repository.js";
import { getUserPreferences } from "./database/user-preference-repository.js";
import { CategoryRecord, UserPreferencesRecord } from "./database/schema.js";

import bindThemeEvents from "./pages/bookshelf/events/bookshelf-header-events.js";
import bindBookImportEvents from "./pages/bookshelf/features/import-books.js";
import bindCategoryEvents from "./pages/bookshelf/events/category-events.js";
import bindBookCardEvents from "./pages/bookshelf/events/book-card-events.js";

import renderBookshelf from "./pages/bookshelf/features/render-bookshelf.js";

await openDatabase();

await addCategory(new CategoryRecord("Your Books"));

await renderBookshelf();

const userPreferences = await getUserPreferences();
document.documentElement.setAttribute('data-theme', userPreferences.theme);
bindThemeEvents();

bindCategoryEvents();
bindBookCardEvents();
bindBookImportEvents();


