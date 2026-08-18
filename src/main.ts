import { openDatabase, defaultPreferences } from "./database/database.js";
import { getUserPreferences, setUserPreferences } from "./database/user-preference-repository.js";

import bindBookshelfHeaderEvents from "./pages/bookshelf/events/bookshelf-header-events.js";
import bindBookImportEvents from "./pages/bookshelf/features/import-books.js";
import bindCategoryEvents from "./pages/bookshelf/events/category-events.js";
import bindBookCardEvents from "./pages/bookshelf/events/book-card-events.js";

import renderBookshelf from "./pages/bookshelf/features/render-bookshelf.js";

await openDatabase();
await renderBookshelf();
try {
   const userPreferences = await getUserPreferences();
   document.documentElement.setAttribute('data-theme', userPreferences.theme);
}
catch {
   setUserPreferences(defaultPreferences);
}

bindBookshelfHeaderEvents();
bindCategoryEvents();
bindBookCardEvents();
bindBookImportEvents();


